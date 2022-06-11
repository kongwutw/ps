import { Renderer } from '../../../render/renderer/interface/Renderer';
import { WebglRenderer } from '../../../render/renderer/webgl.renderer';
import { AttributeBasicInfo } from '../../../render/shaders/components/attribute/interfaces/attribute.basic.info';
import { ShaderAttributeData } from '../../../render/shaders/components/attribute/shader.attribute.data';
import { BoundingBox } from '../../bounding.box';
import { Skin } from '../../skin/skin';
import { Primitive } from '../primitives/primitive';
import { SkinnedPrimitive } from '../primitives/skinned.primitive';

import { MathUtil } from '@/util/math';

export class Geometry {
  private _bound: BoundingBox;
  private _attributesDatas: Record<AttributeBasicInfo, ShaderAttributeData> = Object.create(null);
  private _indices: Uint16Array | Uint32Array;
  private _renderer: Renderer;
  private _attributeIndices: WebGLBuffer;
  private _skin: Skin;
  public uuid;
  public type;
  public dontDice: boolean;
  public numElements: number;
  public attributes = [];

  constructor(renderer: WebglRenderer) {
    this.uuid = MathUtil.generateUUID();
    this.type = 'Geometry';
    this._renderer = renderer;
  }

  public updateAttributesDatas(primitive: Primitive) {
    if (primitive.indices) {
      this.numElements = primitive.indices.length;
    } else {
      this.numElements = primitive.position.length / 3;
      this.dontDice = true;
    }
    // 顶点坐标
    if (primitive.position) {
      this.updateAttributesData(AttributeBasicInfo.a_POSITION, primitive.position, 3);
    }
    // 法向量
    if (primitive.normal) {
      this.updateAttributesData(AttributeBasicInfo.a_NORMAL, primitive.normal, 3);
    }
    // 纹理坐标
    if (primitive.texcoord) {
      this.updateAttributesData(AttributeBasicInfo.a_TEXCOORD_0, primitive.texcoord, 2);
    }
    if (primitive.tangents) {
      this.updateAttributesData(AttributeBasicInfo.a_TANGENT, primitive.tangents, 4);
    }
    // 骨骼
    if (primitive instanceof SkinnedPrimitive) {
      if (primitive.boneJoint) {
        this.updateAttributesData(AttributeBasicInfo.a_JOINTS_0, primitive.boneJoint, 4);
      }
      if (primitive.boneWeights) {
        this.updateAttributesData(AttributeBasicInfo.a_WEIGHTS_0, primitive.boneWeights, 4);
      }
    }
    // 索引
    if (primitive.indices) {
      this.updateIndice(primitive.indices);
    }
  }

  // 更新索引 给 gl.drawElement用的
  public updateIndice(value?: Uint16Array | Uint32Array) {
    if (!this.dontDice) {
      const gl = this._renderer.gl;
      if (!this._attributeIndices) {
        this._attributeIndices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._attributeIndices);
        if (value) {
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, value, gl.STATIC_DRAW);
          this._indices = value;
        }
      } else {
        // Logger.info('updateIndice', value)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._attributeIndices);
        if (value && value !== this._indices) {
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, value, gl.STATIC_DRAW);
          this._indices = value;
        }
      }
    }
  }

  // 更新顶点着色器的属性
  public updateAttributesData(name, array, numComponents: number) {
    const gl = this._renderer.gl;
    if (!this.attributesData[name]) {
      const uuid = ShaderAttributeData.shaderAttributeDataID ? ShaderAttributeData.shaderAttributeDataID++ : 1;
      const attributeData = new ShaderAttributeData(uuid, name);
      attributeData.buffer = gl.createBuffer();
      this.attributesData[name] = attributeData;
    }
    const data = this.attributesData[name];
    if (name === 'a_JOINTS_0') {
      // TODO 这里要研究一下
      array = new Float32Array([0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0]);
    }
    data.name = name;
    data.numComponents = numComponents;
    data.value = array;
    this.attributes.push(name);
  }

  public dispose() {
    const gl = this._renderer.gl;
    this.attributes.forEach(name => {
      const attribute = this.attributesData[name];
      gl.deleteBuffer(attribute.buffer);
      attribute.dispose();
    });
    gl.deleteBuffer(this._attributeIndices);
    this._indices = null;
    this._attributesDatas = null;
    this._renderer = null;
  }

  get attributesData(): Record<AttributeBasicInfo, ShaderAttributeData> {
    return this._attributesDatas;
  }

  get indices() {
    return this._indices;
  }

  get skin() {
    return this._skin;
  }

  set skin(value) {
    this._skin = value;
  }
}
