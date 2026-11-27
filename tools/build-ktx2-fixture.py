"""Build an original 32×32 UASTC fixture. Pass the path to the basisu CLI."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import struct
import subprocess
import sys
import zlib


def png_chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))


def glb(texture):
    vertices = [(-1, -1), (1, -1), (1, 1), (-1, -1), (1, 1), (-1, 1)]
    positions = b''.join(struct.pack('<fff', x, y, 0) for x, y in vertices)
    uv = b''.join(struct.pack('<ff', (x+1)/2, (1-y)/2) for x, y in vertices)
    data = positions + uv + texture
    views = []
    offset = 0
    for item in (positions, uv, texture):
        views.append(dict(buffer=0, byteOffset=offset, byteLength=len(item)))
        offset += len(item)
    extension = 'KHR_texture_basisu'
    model = dict(asset=dict(version='2.0'), extensionsUsed=[extension], extensionsRequired=[extension],
                 buffers=[dict(byteLength=len(data))], bufferViews=views,
                 accessors=[dict(bufferView=0, componentType=5126, count=6, type='VEC3',
                                 min=[-1,-1,0], max=[1,1,0]),
                            dict(bufferView=1, componentType=5126, count=6, type='VEC2')],
                 images=[dict(bufferView=2, mimeType='image/ktx2')],
                 textures=[dict(extensions={extension: dict(source=0)})],
                 materials=[dict(pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicFactor=0))],
                 meshes=[dict(primitives=[dict(attributes=dict(POSITION=0, TEXCOORD_0=1),material=0)])],
                 nodes=[dict(mesh=0)], scenes=[dict(nodes=[0])], scene=0)
    document = json.dumps(model, separators=(',', ':')).encode()
    document += b' ' * (-len(document) % 4)
    data += b'\0' * (-len(data) % 4)
    return (struct.pack('<4sII', b'glTF', 2, 28+len(document)+len(data))
            + struct.pack('<I4s', len(document), b'JSON') + document
            + struct.pack('<I4s', len(data), b'BIN\0') + data)


with TemporaryDirectory() as directory:
    folder = Path(directory)
    source = folder/'checker.png'
    rows = b''.join(b'\x00'+b''.join(bytes((255, 130, 62) if (x//8+y//8)%2 else (33, 79, 132))
                                    for x in range(32)) for y in range(32))
    source.write_bytes(b'\x89PNG\r\n\x1a\n'
                       + png_chunk(b'IHDR', struct.pack('>IIBBBBB',32,32,8,2,0,0,0))
                       + png_chunk(b'IDAT', zlib.compress(rows)) + png_chunk(b'IEND', b''))
    output = folder/'checker.ktx2'
    subprocess.run([sys.argv[1], '-ktx2', '-uastc', '-mipmap', '-file', str(source),
                    '-output_file', str(output)], check=True)
    (Path(__file__).resolve().parents[1]/'tests/fixtures/checker-basis.glb').write_bytes(glb(output.read_bytes()))
