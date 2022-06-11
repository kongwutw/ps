import { mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { ShaderUtil } from '../../../util/shader.util';
import { WebglRenderer } from '../renderer/webgl.renderer';
import { ShaderBasicInfo } from './components/uniform/interfaces/shader.basic.info';
import { ShaderProgram } from './components/shader.program';
import { ShaderUniformData } from './components/uniform/shader.uniform.data';
import { ShaderAttributeData } from './components/attribute/shader.attribute.data';
import { ShaderAttribute } from './components/attribute/shader.attribute';
import { ShaderUniform } from './components/uniform/shader.uniform';
import { Texture2D } from '../texture/texture.2d';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './glsl/basic.glsl';
import { BLENDING, BlendingType, DepthType, SIDE, SideType } from '../../constants/constants';
import { Logger } from '../../../extends/logger/logger';
import { Texture } from '../texture/texture';
import { ShaderFactory } from './util/shader.factory';
import { ShaderMacroCollection } from './macro/shader.macro.collection';
import { ShaderMacro } from './macro/shader.macro';

export class BasicShader {
  private static _shaderExtension = ['GL_EXT_shader_texture_lod', 'GL_OES_standard_derivatives', 'GL_EXT_draw_buffers'];

  private _vertexSource: string;
  private _fragmentSource: string;
  protected _shaderProgram: ShaderProgram;
  protected _renderer: WebglRenderer;
  protected _uniformsDatas: Record<ShaderBasicInfo, ShaderUniformData> = Object.create(null);
  // protected _attributesDatas: Record<AttributeBasicInfo, ShaderAttributeData> = Object.create(null);
  protected _texture2D: Texture2D;

  // 缓存shaderprogram
  protected _shaderProgramCache: WeakMap<ShaderMacroCollection, ShaderProgram> = new WeakMap();
  protected _macroCollectionList: ShaderMacroCollection[] = [];

  public currentMacroCollection: ShaderMacroCollection;
  public name: string;
  public drawType: GLenum;
  public side: SideType;
  public transparent: boolean;
  public polygonOffset: boolean;
  public alphaToCoverage: boolean;
  public polygonOffsetFactor: number = 0;
  public polygonOffsetUnits: number = 0;
  public blending: BlendingType;
  public blendEquation: BlendingType;
  public blendSrc: BlendingType;
  public blendDst: BlendingType;
  public blendEquationAlpha: BlendingType;
  public blendSrcAlpha: BlendingType;
  public blendDstAlpha: BlendingType;
  public premultipliedAlpha: boolean;
  public depthTest: boolean;
  public depthFunc: DepthType;
  public depthWrite: DepthType;
  public dontDice: boolean;

  constructor(name: string, renderer: WebglRenderer, defines: any, vertexSource?: string, fragmentSource?: string) {
    this.name = name;
    this._renderer = renderer;
    this.currentMacroCollection = new ShaderMacroCollection(defines);
    this._vertexSource = vertexSource || VERTEX_SHADER;
    this._fragmentSource = fragmentSource || FRAGMENT_SHADER;
    this._shaderProgram = this.getShaderProgram();
    const gl = renderer.gl;

    this.drawType = gl.TRIANGLES;

    // 初始化渲染状态值
    this.side = SIDE.FRONTSIDE;
    this.transparent = false;
    this.polygonOffset = false;
    this.alphaToCoverage = false;
    this.blending = BLENDING.NormalBlending;
    this.depthTest = true;

    this._uniformsDatas = {
      u_MVPMat: null,
      u_TEXTURE_0: null,
      u_MMat: null,
      u_VMat: null,
      u_PMat: null,
      u_NMat: null,
      u_CameraPos: null,
      u_TilingOffset: null
    };

    // 初始化attribute数据
    // this._shaderProgram.attributeLocation.forEach(attribute => {
    //   const uuid = ShaderAttributeData.shaderAttributeDataID ? ShaderAttributeData.shaderAttributeDataID++ : 1;
    //   const attributeData = new ShaderAttributeData(uuid, attribute._name);
    //   attributeData.buffer = this._renderer.gl.createBuffer();
    //   this._attributesDatas[attribute._name] = attributeData;
    // });
    // Logger.info('_attributesDatas', this._attributesDatas);
    // 初始化shader数据
    this._shaderProgram.uniformsLocation.forEach(uniform => {
      const shaderData = this.makeShaderData(uniform._name, uniform._isArray, uniform._type);
      this._uniformsDatas[uniform._name] = shaderData;
    });
    Logger.info(this.uniformsData);
  }

  /**
   * makeShaderData
   */
  public makeShaderData(name, isArray, type?, value?) {
    const gl = this._renderer.gl;

    const uuid = ShaderUniformData.shaderUniformDataID ? ShaderUniformData.shaderUniformDataID++ : 1;
    const shaderData = new ShaderUniformData(uuid, name);
    switch (type) {
      case gl.FLOAT:
        if (isArray) {
          shaderData.value = new Float32Array();
        } else {
          shaderData.value = 0.0;
        }
        break;
      case gl.FLOAT_VEC2:
        if (isArray) {
          shaderData.value = new Float32Array();
        } else {
          shaderData.value = vec2.create();
        }
        break;
      case gl.FLOAT_VEC3:
        if (isArray) {
          shaderData.value = new Float32Array();
        } else {
          shaderData.value = vec3.create();
        }
        break;
      case gl.FLOAT_VEC4:
        if (isArray) {
          shaderData.value = new Float32Array();
        } else {
          shaderData.value = vec4.create();
        }
        break;
      case gl.BOOL:
      case gl.INT:
        if (isArray) {
          shaderData.value = new Int32Array();
        } else {
          shaderData.value = 0;
        }
        break;
      case gl.BOOL_VEC2:
      case gl.INT_VEC2:
        if (isArray) {
          shaderData.value = new Int32Array();
        } else {
          shaderData.value = vec2.create();
        }
        break;
      case gl.BOOL_VEC3:
      case gl.INT_VEC3:
        if (isArray) {
          shaderData.value = new Int32Array();
        } else {
          shaderData.value = vec3.create();
        }
        break;
      case gl.BOOL_VEC4:
      case gl.INT_VEC4:
        if (isArray) {
          shaderData.value = new Int32Array();
        } else {
          shaderData.value = vec4.create();
        }
        break;
      case gl.FLOAT_MAT4:
        if (isArray) {
          shaderData.value = new Float32Array();
        } else {
          shaderData.value = mat4.create();
        }
        break;
      case gl.FLOAT_MAT3:
        if (isArray) {
          shaderData.value = new Float32Array();
        } else {
          shaderData.value = mat3.create();
        }
        break;
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE:
        // Logger.debug('debug', uniform)
        shaderData.value = this._renderer.whiteTexture2D;
        // 因为在shaderProgram里面已经初始化好了,这里就是记录一下
        shaderData.needsUpdate = false;
        break;
      default:
        shaderData.value = value;
        break;
    }
    return shaderData;
  }

  /**
   * makeAllUniformAvailable
   */
  public makeAllAvailable() {
    this.shaderProgram.uniformsLocation.forEach((shaderUniform: ShaderUniform) => {
      const uniformData = this._uniformsDatas[shaderUniform._name];
      if (uniformData) {
        uniformData.needsUpdate = true;
      }
    });
  }

  public updateUniformsData(name, value) {
    if (this.uniformsData && this.uniformsData[name]) {
      this.uniformsData[name].name = name;
      this.uniformsData[name].value = value;
      if (value instanceof Texture) {
        // console.log('updateUniformsData', name, value);
      }
      // Logger.info('updateUniformsData', value);
    } else {
      const shaderData = this.makeShaderData(name, false, null, value);
      shaderData.value = value;
      this.uniformsData[name] = shaderData;
      Logger.warn('updateUniformsData: 没找到相关属性, 创建一个新的', name, value, this.uniformsData);
    }
  }

  public uploadAttributes(data: ShaderAttributeData) {
    const shaderAttribute: ShaderAttribute = this.shaderProgram.attributeLocation.find(aloc => aloc._name === data.name);
    if (data?.needsUpdate && shaderAttribute) {
      shaderAttribute.applyFunc(data);
      data.needsUpdate = false;
      Logger.info('uploadAttributes', data);
    }
  }

  // 渲染循环内
  public enableAttributes(attributesDatas) {
    this.shaderProgram.attributeLocation.forEach((shaderAttribute: ShaderAttribute) => {
      const attributeData: ShaderAttributeData = attributesDatas[shaderAttribute._name];
      shaderAttribute.enableFunc(shaderAttribute, attributeData);
    });
    // this.updateIndice();
  }

  // 渲染循环内
  public enableUniforms() {
    this.shaderProgram.uniformsLocation.forEach((shaderUniform: ShaderUniform) => {
      const shaderData = this._uniformsDatas[shaderUniform._name];
      if (shaderData.needsUpdate || shaderData.value instanceof Texture) {
        shaderUniform.applyFunc(shaderUniform, shaderData.value);
        if (shaderData.value instanceof Texture) {
          // console.log(shaderData.value);
        }
        // TODO 把texture 分开保存， 因为每帧可能都需要切换bind，这里先用if判断
        shaderData.needsUpdate = false;
      }
    });
  }

  public getShaderProgram() {
    let shaderProgram = this._shaderProgramCache.get(this.currentMacroCollection);
    if (shaderProgram) {
      return shaderProgram;
    }
    // const gl = this._renderer.gl;
    const isWebGL2 = this._renderer.isWebGL2;
    Logger.info('isWebGL2', isWebGL2);

    const versionStr = isWebGL2 ? '#version 300 es' : '#version 100';
    const precisionStr = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
          precision highp int;
        #else
          precision mediump float;
          precision mediump int;
        #endif
        `;

    const defineStr = this.currentMacroCollection.generateDefines();
    Logger.info('defineStr', defineStr);
    let vertexSource = ShaderFactory.parseIncludes(
      `${versionStr}
    ${precisionStr}
    ${defineStr}
    ` + this._vertexSource
    );
    Logger.info(vertexSource);
    let fragmentSource = ShaderFactory.parseIncludes(
      `${versionStr}
      ${isWebGL2 ? '' : ShaderUtil.parseExtension(BasicShader._shaderExtension)}
      ${precisionStr}
      ${defineStr}
      ` + this._fragmentSource
    );
    Logger.info(fragmentSource);

    if (isWebGL2) {
      vertexSource = ShaderFactory.convertTo300(vertexSource);
      fragmentSource = ShaderFactory.convertTo300(fragmentSource, true);
    }
    shaderProgram = new ShaderProgram(this._renderer, vertexSource, fragmentSource);

    this.setCacheShaderProgram(this.currentMacroCollection, shaderProgram);
    // Logger.info(vertexSource);
    // 因为新建program 参数内存地址会变化
    this.makeAllAvailable();
    return shaderProgram;
  }

  // TODO 这里要优化一下缓存问题
  addMacro(macro: ShaderMacro) {
    const newMC = this.currentMacroCollection.addMacro(macro);
    const target = this.getCacheMacroCollection(newMC);
    // console.log('addMacro', target, this._macroCollectionList);
    if (target) {
      this.currentMacroCollection = target;
    } else {
      this.currentMacroCollection = newMC;
    }
  }

  removeMacro(key) {
    const newMC = this.currentMacroCollection.removeMacro(key);
    const target = this.getCacheMacroCollection(newMC);
    if (target) {
      this.currentMacroCollection = target;
    } else {
      this.currentMacroCollection = newMC;
    }
  }

  get shaderProgram() {
    this._shaderProgram = this.getShaderProgram();
    return this._shaderProgram;
  }

  get uniformsData(): Record<ShaderBasicInfo, ShaderUniformData> {
    return this._uniformsDatas;
  }

  // 不需要实时跑，性能可以优化，但是不太影响
  getCacheMacroCollection(target: ShaderMacroCollection) {
    const macroCollection = this._macroCollectionList.find(mc => {
      return mc.equal(target);
    });
    return macroCollection;
  }

  setCacheShaderProgram(key: ShaderMacroCollection, shaderProgram: ShaderProgram) {
    if (!this._shaderProgramCache.has(key)) {
      this._macroCollectionList.push(key);
      this._shaderProgramCache.set(key, shaderProgram);
    }
  }

  public dispose() {
    this._shaderProgram?.dispose();
    this._uniformsDatas = null;
    // this._attributesDatas = null;
    this._renderer = null;
    this._vertexSource = null;
    this._fragmentSource = null;
    this.currentMacroCollection = null;
    this._shaderProgram = null;
  }
}
