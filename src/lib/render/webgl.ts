/* eslint-disable no-unused-vars */
import { vec4 } from 'gl-matrix';
import { ElsaCanvas } from '../canvas';
import { Node } from '../node';

import { GLTexture } from '../texture/gl.texture';

import { Texture2D } from '../texture/texture.2d';
import { GLTexture2D } from '../texture/gl.texture.2d';

import { ShaderProgram } from '../shaders/components/shader.program';
import { TextureCubeFace, TextureFormat } from '../texture/texture.format';
import { BLENDING, CULLFACE, DEPTH, SIDE } from '../../constants/constants';
import { DepthState } from './depth.state';
import { BasicShader } from '../shaders/shader.basic';
import { Logger } from '../../../extends/logger/logger';
import { TextureCube } from '../texture/texture.cube';
import { GLTextureCube } from '../texture/gl.texture.cube';

interface Renderer {
  [key: string]: any;
}

export enum RenderMode {
  /** Auto, use WebGL1.0 if support */
  Auto = 0,
  /** WebGL2.0. */
  WebGL2 = 1,
  /** WebGL1.0, */
  WebGL1 = 2,
  /** Galaxy, */
  Galaxy = 3
}

export interface ShaderKey {
  // shader的名称
  name: string;
  // shader的基础配置
  config: string;
}

/**
 * WebGL 渲染器.
 * @category 渲染
 */
export interface WebGLRendererOptions extends WebGLContextAttributes {
  /** WebGL mode. */
  renderMode?: RenderMode;
}

export class WebglRenderer implements Renderer {
  private _options: WebGLRendererOptions;

  private _gl: WebGLRenderingContext | WebGL2RenderingContext;
  // 缓存当前激活的纹理ID（wasm后会变化）
  private _activeTextureID: number = WebGLRenderingContext.TEXTURE0;
  // 缓存当前激活的纹理（wasm后会变化）
  private _activeTextures: GLTexture[] = new Array(32);
  private _isWebGL2: boolean;
  private _useVao: boolean;
  private vao: Map<number, WebGLVertexArrayObject> = new Map();
  // 缓存shaderprogramd
  private _shaderProgramCache: WeakMap<ShaderKey, ShaderProgram> = new WeakMap();

  // cache value
  private _lastViewport: vec4 = vec4.create();
  // 是否要强行bind， 因为了不知道c++内做了什么操作
  private forceBind: boolean = false;
  private _whiteTexture2D: Texture2D;
  private _whiteTextureCube: TextureCube;
  // 判断renderstate
  private _currentFlipSided: any;
  private _currentPolygonOffsetFactor: number;
  private _currentPolygonOffsetUnits: number;
  private _currentBlendingEnabled: boolean = false;
  private _currentBlending: any;
  private _currentBlendEquation: any;
  private _currentBlendEquationAlpha: any;
  private _currentPremultipledAlpha: any;
  private _currentBlendSrc: any;
  private _currentBlendDst: any;
  private _currentBlendDstAlpha: any;
  private _currentBlendSrcAlpha: any;
  private _depthState: DepthState;
  private _currentCullFace: any;

  public currentUsedProgram: WebGLProgram;

  constructor(option: WebGLRendererOptions = {}, canvas: any) {
    this._options = option;
    option.alpha === undefined && (option.alpha = false);
    option.stencil === undefined && (option.stencil = true);

    const webCanvas = (canvas as ElsaCanvas).webCanvas;
    const webGLMode = option.renderMode || RenderMode.Auto;
    let gl: WebGLRenderingContext | WebGL2RenderingContext;
    Logger.info('webGLMode', option);
    if (webGLMode === RenderMode.WebGL2) {
      gl = webCanvas.getContext('webgl2', option);
      if (!gl && webCanvas instanceof HTMLCanvasElement) {
        gl = <WebGL2RenderingContext>webCanvas.getContext('experimental-webgl2', option);
      }
      this._isWebGL2 = true;

      // Prevent weird browsers to lie (such as safari!)
      if (gl && !(<WebGL2RenderingContext>gl).deleteQuery) {
        this._isWebGL2 = false;
      }
    }
    if (!gl) {
      if (webGLMode === RenderMode.Auto || webGLMode === RenderMode.WebGL1) {
        gl = <WebGLRenderingContext>webCanvas.getContext('webgl', option);
        if (!gl && webCanvas instanceof HTMLCanvasElement) {
          gl = <WebGLRenderingContext>webCanvas.getContext('experimental-webgl', option);
        }
        this._isWebGL2 = false;
      }
    }
    if (!gl) {
      throw new Error('Get GL Context FAILED.');
    }
    this._useVao = this._isWebGL2;
    this._gl = gl;
    this._activeTextureID = gl.TEXTURE0;
    // TODO 补充一些状态
    // this._renderStates = new GLRenderStates(gl);
    // this._extensions = new GLExtensions(this);
    // this._capability = new GLCapability(this);
    // Make sure the active texture in gl context is on default, because gl context may be used in other webgl renderer.
    const whitePixel = new Uint8Array([255, 255, 255, 255]);
    this._whiteTexture2D = new Texture2D(this, null, 1, 1, TextureFormat.R8G8B8A8, false);
    this._whiteTexture2D.setPixelBuffer(whitePixel);

    this._whiteTextureCube = new TextureCube(this, null, 1, TextureFormat.R8G8B8A8, false);
    this._whiteTextureCube.setPixelBuffer(TextureCubeFace.PositiveX, whitePixel);
    this._whiteTextureCube.setPixelBuffer(TextureCubeFace.NegativeX, whitePixel);
    this._whiteTextureCube.setPixelBuffer(TextureCubeFace.PositiveY, whitePixel);
    this._whiteTextureCube.setPixelBuffer(TextureCubeFace.NegativeY, whitePixel);
    this._whiteTextureCube.setPixelBuffer(TextureCubeFace.PositiveZ, whitePixel);
    this._whiteTextureCube.setPixelBuffer(TextureCubeFace.NegativeZ, whitePixel);
    // this._whiteTextureCube.isGCIgnored = true;

    gl.activeTexture(this._activeTextureID);

    this._options = null;
    this._depthState = new DepthState(gl);
    this.resetRenderState();
  }

  viewport(x: number, y: number, width: number, height: number): void {
    // Logger.info('viewport', x, y, width, height);
    // gl.enable(gl.SCISSOR_TEST);
    // gl.scissor(x, transformY, width, height);
    const gl = this._gl;
    const lv = this._lastViewport;
    if (x !== lv[0] || y !== lv[1] || width !== lv[2] || height !== lv[3]) {
      gl.viewport(x, y, width, height);
      vec4.set(lv, x, y, width, height);
    }
  }

  colorMask(r, g, b, a) {
    this._gl.colorMask(r, g, b, a);
  }

  activeTexture(textureID: number): void {
    if (this._activeTextureID !== textureID) {
      this._gl.activeTexture(textureID);
      this._activeTextureID = textureID;
    }
  }

  bindTexture(texture: GLTexture): void {
    const index = this._activeTextureID - this._gl.TEXTURE0;
    if (this._activeTextures[index] !== texture || this.forceBind) {
      this._gl.bindTexture(texture._target, texture._webglTexture);
      this._activeTextures[index] = texture;
      this.forceBind = false;
    }
  }

  uploadTexture(image) {
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, image);
  }

  createPlatformTexture2D(texture2D: Texture2D, dontCreateBuffer?: boolean) {
    Logger.info('createPlatformTexture2D', texture2D);
    return new GLTexture2D(this, texture2D, dontCreateBuffer);
  }

  createPlatformTextureCubeMap(textureCube: TextureCube) {
    return new GLTextureCube(this, textureCube);
  }

  render(sprite: any) {
    if (!sprite.geometry) {
      return;
    }
    const shaderProgram = sprite.shader.shaderProgram;
    shaderProgram.useProgram();
    // vao for webgl2
    if (this._useVao) {
      if (!this.vao.has(shaderProgram.id)) {
        this.registerVAO(shaderProgram);
      } else {
        const vao = this.vao.get(shaderProgram.id);
        (this._gl as WebGL2RenderingContext).bindVertexArray(vao);
      }
    }
    this.enableAttAndUniforms(sprite);
    if (sprite.geometry.indices) {
      this._drawElement(sprite);
    } else {
      this._drawArrays(sprite);
    }
    if (this._useVao) {
      this.unbindVAO();
    }
  }

  getShaderProgram(key: ShaderKey) {
    return this._shaderProgramCache.get(key);
  }

  setShaderProgram(key: ShaderKey, shaderProgram: ShaderProgram) {
    if (!this._shaderProgramCache.has(key)) {
      this._shaderProgramCache.set(key, shaderProgram);
    }
  }

  _drawArrays(sprite: Node) {
    const gl = this._gl;
    // Draw the rectangle.
    const primitiveType = (sprite as any).shader.drawType;
    gl.drawArrays(primitiveType, 0, (sprite as any).geometry.numElements);
  }

  _drawElement(sprite: Node) {
    const gl = this._gl;
    const primitiveType = gl.TRIANGLES;
    gl.drawElements(primitiveType, (sprite as any).geometry.numElements, gl.UNSIGNED_SHORT, 0);
  }

  switch2WebglEnv(force?: boolean) {
    // 还原viewport
    const vp = vec4.clone(this._lastViewport);
    this._lastViewport = vec4.create();
    this.viewport(0, 0, vp[2], vp[3]);
    // 还原shaderProgram
    this.currentUsedProgram = null;
    // 还原当前激活的纹理
    this._gl.activeTexture(this._activeTextureID);
    // 下一次还是需要bind
    this.forceBind = force;
    // this.resetRenderState();
  }

  enableAttAndUniforms(object) {
    const geo = object.geometry;
    geo.updateIndice();
    object.shader.enableAttributes(geo.attributesData);
    object.shader.enableUniforms();
  }

  // 根据shader设置渲染状态
  setRenderStateByShader(shader: BasicShader, frontFaceCW?: boolean) {
    const gl = this._gl;

    // cull-face
    let flipSide = shader.side === SIDE.BACKSIDE;
    if (frontFaceCW) {
      flipSide = !flipSide;
    }
    this._setFlipSide(flipSide);
    this._setCullFace(shader.side);
    // blending
    shader.blending === BLENDING.NormalBlending && shader.transparent === false
      ? this._setBlending(BLENDING.NoBlending)
      : this._setBlending(shader.blending, shader.blendEquation, shader.blendSrc, shader.blendDst, shader.blendEquationAlpha, shader.blendSrcAlpha, shader.blendDstAlpha, shader.premultipliedAlpha);

    // 深度检测状态
    this._depthState.setFunc(shader.depthFunc);
    this._depthState.setTest(shader.depthTest);
    this._depthState.setMask(shader.depthWrite);

    this._setPolygonOffset(shader.polygonOffset, shader.polygonOffsetFactor, shader.polygonOffsetUnits);

    shader.alphaToCoverage === true ? gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE) : gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  }

  // 默认渲染状态
  resetRenderState() {
    const gl = this._gl;
    // init blend state same as BlendState default value.
    this._setBlending(this._currentBlending);
    this.colorMask(true, true, true, true);

    // init depth state same as DepthState default value.
    this._depthState.setFunc(DEPTH.LessDepth);
    this._depthState.setTest(false);
    this._depthState.setMask(true);

    // init stencil state same as StencilState default value.
    gl.disable(gl.STENCIL_TEST);
    gl.stencilFuncSeparate(gl.FRONT, gl.ALWAYS, 0, 0xff);
    gl.stencilFuncSeparate(gl.BACK, gl.ALWAYS, 0, 0xff);
    gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.KEEP);
    gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.KEEP);
    gl.stencilMask(0xff);
    // init raster state same as RasterState default value.
    this._setFlipSide(this._currentFlipSided);
    this._setCullFace(this._currentCullFace);
    this._setPolygonOffset(false, 0, 0);
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  }

  get gl() {
    return this._gl;
  }

  get isWebGL2() {
    return this._isWebGL2;
  }

  get currentTexture() {
    const index = this._activeTextureID - this._gl.TEXTURE0;
    return this._activeTextures[index];
  }

  set currentTexture(value) {
    const index = this._activeTextureID - this._gl.TEXTURE0;
    this._activeTextures[index] = value;
    this._activeTextureID = WebGLRenderingContext.TEXTURE0;
  }

  get whiteTexture2D() {
    return this._whiteTexture2D;
  }

  get whiteTextureCube() {
    return this._whiteTextureCube;
  }

  private registerVAO(shaderProgram: ShaderProgram): void {
    const gl = this._gl as WebGL2RenderingContext;
    const vao = gl.createVertexArray();

    /** register VAO */
    gl.bindVertexArray(vao);
    this.vao.set(shaderProgram.id, vao);
  }

  private unbindVAO() {
    const gl = this._gl as WebGL2RenderingContext;
    /** unbind */
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    // this.disableAttrib();
  }

  protected disableAttrib(stuff: Node): void {
    const gl = this._gl;
    // for (let i = 0, l = node.attribLocArray.length; i < l; i++) {
    //   gl.disableVertexAttribArray(this.attribLocArray[i]);
    // }
  }

  // eslint-disable-next-line accessor-pairs
  set lastViewport(value: vec4) {
    this._lastViewport = value;
  }

  private _setFlipSide(flipSide: boolean) {
    const gl = this._gl;
    if (this._currentFlipSided !== flipSide) {
      if (flipSide) {
        gl.frontFace(gl.CW);
      } else {
        gl.frontFace(gl.CCW);
      }

      this._currentFlipSided = flipSide;
    }
  }

  private _setCullFace(cullFace) {
    const gl = this._gl;
    if (cullFace !== CULLFACE.CULLFACENONE) {
      gl.enable(gl.CULL_FACE);

      if (cullFace !== this._currentCullFace) {
        if (cullFace === CULLFACE.CULLFACEBACK) {
          gl.cullFace(gl.BACK);
        } else if (cullFace === CULLFACE.CULLFACEFRONT) {
          gl.cullFace(gl.FRONT);
        } else {
          gl.cullFace(gl.FRONT_AND_BACK);
        }
      }
    } else {
      gl.disable(gl.CULL_FACE);
    }

    this._currentCullFace = cullFace;
  }

  private _setPolygonOffset(polygonOffset: boolean, factor: number, units: number) {
    const gl = this._gl;
    if (polygonOffset) {
      gl.enable(gl.POLYGON_OFFSET_FILL);

      if (this._currentPolygonOffsetFactor !== factor || this._currentPolygonOffsetUnits !== units) {
        gl.polygonOffset(factor, units);

        this._currentPolygonOffsetFactor = factor;
        this._currentPolygonOffsetUnits = units;
      }
    } else {
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }
  }

  private _setBlending(blending, blendEquation?, blendSrc?, blendDst?, blendEquationAlpha?, blendSrcAlpha?, blendDstAlpha?, premultipliedAlpha?) {
    const gl = this._gl;
    if (blending === BLENDING.NoBlending) {
      if (this._currentBlendingEnabled === true) {
        gl.disable(gl.BLEND);
        this._currentBlendingEnabled = false;
      }
      return;
    }

    if (this._currentBlendingEnabled === false) {
      gl.enable(gl.BLEND);
      this._currentBlendingEnabled = true;
    }

    if (blending !== BLENDING.CustomBlending) {
      if (blending !== this._currentBlending || premultipliedAlpha !== this._currentPremultipledAlpha) {
        if (this._currentBlendEquation !== BLENDING.AddEquation || this._currentBlendEquationAlpha !== BLENDING.AddEquation) {
          gl.blendEquation(gl.FUNC_ADD);

          this._currentBlendEquation = BLENDING.AddEquation;
          this._currentBlendEquationAlpha = BLENDING.AddEquation;
        }

        if (premultipliedAlpha) {
          switch (blending) {
            case BLENDING.NormalBlending:
              gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
              break;

            case BLENDING.AdditiveBlending:
              gl.blendFunc(gl.ONE, gl.ONE);
              break;

            case BLENDING.SubtractiveBlending:
              gl.blendFuncSeparate(gl.ZERO, gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ONE_MINUS_SRC_ALPHA);
              break;

            case BLENDING.MultiplyBlending:
              gl.blendFuncSeparate(gl.ZERO, gl.SRC_COLOR, gl.ZERO, gl.SRC_ALPHA);
              break;

            default:
              console.error('THREE.WebGLState: Invalid blending: ', blending);
              break;
          }
        } else {
          switch (blending) {
            case BLENDING.NormalBlending:
              gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
              break;

            case BLENDING.AdditiveBlending:
              gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
              break;

            case BLENDING.SubtractiveBlending:
              gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR);
              break;

            case BLENDING.MultiplyBlending:
              gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
              break;

            default:
              break;
          }
        }

        this._currentBlendSrc = null;
        this._currentBlendDst = null;
        this._currentBlendSrcAlpha = null;
        this._currentBlendDstAlpha = null;

        this._currentBlending = blending;
        this._currentPremultipledAlpha = premultipliedAlpha;
      }

      return;
    }

    // custom blending
    const equationToGL = {
      [BLENDING.AddEquation]: gl.FUNC_ADD,
      [BLENDING.SubtractEquation]: gl.FUNC_SUBTRACT,
      [BLENDING.ReverseSubtractEquation]: gl.FUNC_REVERSE_SUBTRACT
    };

    const factorToGL = {
      [BLENDING.ZeroFactor]: gl.ZERO,
      [BLENDING.OneFactor]: gl.ONE,
      [BLENDING.SrcColorFactor]: gl.SRC_COLOR,
      [BLENDING.SrcAlphaFactor]: gl.SRC_ALPHA,
      [BLENDING.SrcAlphaSaturateFactor]: gl.SRC_ALPHA_SATURATE,
      [BLENDING.DstColorFactor]: gl.DST_COLOR,
      [BLENDING.DstAlphaFactor]: gl.DST_ALPHA,
      [BLENDING.OneMinusSrcColorFactor]: gl.ONE_MINUS_SRC_COLOR,
      [BLENDING.OneMinusSrcAlphaFactor]: gl.ONE_MINUS_SRC_ALPHA,
      [BLENDING.OneMinusDstColorFactor]: gl.ONE_MINUS_DST_COLOR,
      [BLENDING.OneMinusDstAlphaFactor]: gl.ONE_MINUS_DST_ALPHA
    };

    blendEquationAlpha = blendEquationAlpha || blendEquation;
    blendSrcAlpha = blendSrcAlpha || blendSrc;
    blendDstAlpha = blendDstAlpha || blendDst;

    if (blendEquation !== this._currentBlendEquation || blendEquationAlpha !== this._currentBlendEquationAlpha) {
      gl.blendEquationSeparate(equationToGL[blendEquation], equationToGL[blendEquationAlpha]);

      this._currentBlendEquation = blendEquation;
      this._currentBlendEquationAlpha = blendEquationAlpha;
    }

    if (blendSrc !== this._currentBlendSrc || blendDst !== this._currentBlendDst || blendSrcAlpha !== this._currentBlendSrcAlpha || blendDstAlpha !== this._currentBlendDstAlpha) {
      gl.blendFuncSeparate(factorToGL[blendSrc], factorToGL[blendDst], factorToGL[blendSrcAlpha], factorToGL[blendDstAlpha]);

      this._currentBlendSrc = blendSrc;
      this._currentBlendDst = blendDst;
      this._currentBlendSrcAlpha = blendSrcAlpha;
      this._currentBlendDstAlpha = blendDstAlpha;
    }

    this._currentBlending = blending;
    this._currentPremultipledAlpha = null;
  }

  public dispose() {
    // TODO 加一个清理
  }
}
