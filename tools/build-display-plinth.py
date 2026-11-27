"""Build the self-contained showroom plinth GLB from authored dimensions."""
import json
import math
import struct
from pathlib import Path

ring = [(-.92, -.50), (.92, -.50), (1.13, -.30), (1.13, .30), (.92, .50), (-.92, .50), (-1.13, .30), (-1.13, -.30)]
buffer = bytearray()
views, accessors, meshes = [], [], []


def accessor(values, width):
    start = len(buffer)
    for row in values:
        buffer.extend(struct.pack('<' + 'f' * width, *row))
    views.append(dict(buffer=0, byteOffset=start, byteLength=len(buffer) - start, target=34962))
    accessors.append(dict(bufferView=len(views)-1, componentType=5126, count=len(values),
                          type='VEC3', min=[min(row[i] for row in values) for i in range(width)],
                          max=[max(row[i] for row in values) for i in range(width)]))
    return len(accessors)-1


def layer(lo, hi, scale, material):
    p, n = [], []

    def triangle(a, b, c, normal):
        p.extend((a, b, c))
        n.extend((normal,) * 3)

    for i, (x, z) in enumerate(ring):
        xx, zz = ring[(i+1) % len(ring)]
        x, z, xx, zz = (a*scale for a in (x, z, xx, zz))
        length = math.hypot(zz-z,xx-x)
        norm = ((zz-z)/length, 0, (x-xx)/length)
        low_a, low_b, top_a, top_b = (x,lo,z), (xx,lo,zz), (x,hi,z), (xx,hi,zz)
        triangle(low_a,top_a,low_b,norm)
        triangle(low_b,top_a,top_b,norm)
        triangle((0,hi,0),top_b,top_a,(0,1,0))
    meshes.append(dict(primitives=[dict(attributes=dict(POSITION=accessor(p,3),NORMAL=accessor(n,3)),
                                        material=material)]))


layer(0,.065,1.0,0)
layer(.065,.084,.985,1)
layer(.084,.105,.964,0)
gltf = dict(asset=dict(version='2.0',generator='MOTOR EMPIRE'),scene=0,
            scenes=[dict(nodes=list(range(len(meshes))))],nodes=[dict(mesh=i) for i in range(len(meshes))],
            meshes=meshes,bufferViews=views,accessors=accessors,buffers=[dict(byteLength=len(buffer))],
            materials=[dict(pbrMetallicRoughness=dict(baseColorFactor=color,metallicFactor=metal,roughnessFactor=rough))
                       for color,metal,rough in [([.09,.12,.14,1],.48,.35),([.73,.36,.14,1],.73,.29)]])
text = json.dumps(gltf,separators=(',',':')).encode()
text += b' ' * (-len(text)%4)
root = Path(__file__).resolve().parents[1]
(root/'assets/3d/models/showroom-plinth.glb').write_bytes(
    struct.pack('<4sII',b'glTF',2,28+len(text)+len(buffer))
    + struct.pack('<I4s',len(text),b'JSON')+text
    + struct.pack('<I4s',len(buffer),b'BIN\0')+buffer)
