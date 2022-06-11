/* eslint-disable no-unused-vars */
import { vec3 } from 'gl-matrix';
import { SphericalHarmonics3 } from '../../extends/ambient/SphericalHarmonics3';
import { ShaderLightInfo } from '../render/shaders/components/uniform/interfaces/shader.light.info';
import { ShaderMacro } from '../render/shaders/macro/shader.macro';
import { BasicShader } from '../render/shaders/shader.basic';
import { TextureCube } from '../render/texture/texture.cube';

/**
 * Diffuse mode.
 */
export enum DiffuseMode {
  /** Solid color mode. */
  SolidColor,

  /**
   * SH mode
   * @remarks
   * Use SH3 to represent irradiance environment maps efficiently, allowing for interactive rendering of diffuse objects under distant illumination.
   */
  SphericalHarmonics
}

export class AmbientLight {
  private static _diffuseColorProperty = ShaderLightInfo.u_EnvMapLight_diffuse;
  private static _diffuseSHProperty = ShaderLightInfo.u_env_sh;
  private static _diffuseIntensityProperty = ShaderLightInfo.u_EnvMapLight_diffuseIntensity;
  private static _specularTextureProperty = ShaderLightInfo.u_Env_specularSampler;
  private static _specularIntensityProperty = ShaderLightInfo.u_EnvMapLight_specularIntensity;
  private static _mipLevelProperty = ShaderLightInfo.u_EnvMapLight_mipMapLevel;

  private _diffuseSphericalHarmonics: SphericalHarmonics3;
  private _diffuseSolidColor: vec3 = [0.212, 0.227, 0.259];
  private _diffuseIntensity: number = 1.0;
  // private _specularReflection: TextureCubeMap;
  private _specularIntensity: number = 1.0;
  private _diffuseMode: DiffuseMode = DiffuseMode.SolidColor;
  private _shArray: Float32Array = new Float32Array(27);
  private _specularTextureDecodeRGBM: boolean = false;
  private _needsUpdate: any;
  private _specularTexture: any;
  private _specularReflection: TextureCube;

  /**
   * Whether to decode from specularTexture with RGBM format.
   */
  get specularTextureDecodeRGBM(): boolean {
    return this._specularTextureDecodeRGBM;
  }

  set specularTextureDecodeRGBM(value: boolean) {
    this._specularTextureDecodeRGBM = value;
  }

  /**
   * Diffuse mode of ambient light.
   */
  get diffuseMode(): DiffuseMode {
    return this._diffuseMode;
  }

  set diffuseMode(value: DiffuseMode) {
    this._diffuseMode = value;
  }

  /**
   * Diffuse reflection solid color.
   * @remarks Effective when diffuse reflection mode is `DiffuseMode.SolidColor`.
   */
  get diffuseSolidColor(): vec3 {
    return this._diffuseSolidColor;
  }

  set diffuseSolidColor(value: vec3) {
    if (value !== this._diffuseSolidColor) {
      this._diffuseSolidColor = vec3.clone(value);
    }
  }

  /**
   * Diffuse reflection spherical harmonics 3.
   * @remarks Effective when diffuse reflection mode is `DiffuseMode.SphericalHarmonics`.
   */
  get diffuseSphericalHarmonics(): SphericalHarmonics3 {
    return this._diffuseSphericalHarmonics;
  }

  set diffuseSphericalHarmonics(value: SphericalHarmonics3) {
    this._diffuseSphericalHarmonics = value;
  }

  get diffuseIntensity(): number {
    return this._diffuseIntensity;
  }

  set diffuseIntensity(value: number) {
    this._diffuseIntensity = value;
  }

  get needsUpdate() {
    return this._needsUpdate;
  }

  set needsUpdate(value) {
    this._needsUpdate = value;
  }

  /**
   * Specular reflection texture.
   */
  get specularTexture(): TextureCube {
    return this._specularReflection;
  }

  set specularTexture(value: TextureCube) {
    this._specularReflection = value;
  }

  /**
   * Specular reflection intensity.
   */
  get specularIntensity(): number {
    return this._specularIntensity;
  }

  set specularIntensity(value: number) {
    this._specularIntensity = value;
  }

  // 渲染循环内部不停调用
  updateShaderData(shader: BasicShader, tail?: boolean) {
    if (!this._needsUpdate) return;
    /**
     * ambientLight and envMapLight only use the last one in the scene
     * */
    shader.updateUniformsData(AmbientLight._diffuseColorProperty, this.diffuseSolidColor);

    if (this.diffuseMode === DiffuseMode.SphericalHarmonics) {
      const macro = new ShaderMacro('USE_SH', true);
      shader.addMacro(macro);
    }

    if (this.diffuseSphericalHarmonics) {
      shader.updateUniformsData(AmbientLight._diffuseSHProperty, this._preComputeSH(this.diffuseSphericalHarmonics, this._shArray));
    }

    if (this.diffuseIntensity) {
      shader.updateUniformsData(AmbientLight._diffuseIntensityProperty, this.diffuseIntensity);
    }

    if (this.specularTexture) {
      shader.updateUniformsData(AmbientLight._specularTextureProperty, this.specularTexture);
      shader.updateUniformsData(AmbientLight._mipLevelProperty, this._specularReflection.mipmapCount - 1);
      const macro1 = new ShaderMacro('USE_SPECULAR_ENV', true);
      const macro2 = new ShaderMacro('USE_TEX_LOD', true);
      shader.addMacro(macro1);
      shader.addMacro(macro2);
    }

    if (this.specularIntensity) {
      shader.updateUniformsData(AmbientLight._specularIntensityProperty, this.specularIntensity);
    }

    if (this.specularTextureDecodeRGBM) {
      const macro = new ShaderMacro('DECODE_ENV_RGBM', true);
      shader.addMacro(macro);
    }

    // TODO 控制效率，每次按需更新比较好
    if (tail) {
      this._needsUpdate = false;
    }
  }

  private _preComputeSH(sh: SphericalHarmonics3, out: Float32Array): Float32Array {
    /**
     * Basis constants
     *
     * 0: 1/2 * Math.sqrt(1 / Math.PI)
     *
     * 1: -1/2 * Math.sqrt(3 / Math.PI)
     * 2: 1/2 * Math.sqrt(3 / Math.PI)
     * 3: -1/2 * Math.sqrt(3 / Math.PI)
     *
     * 4: 1/2 * Math.sqrt(15 / Math.PI)
     * 5: -1/2 * Math.sqrt(15 / Math.PI)
     * 6: 1/4 * Math.sqrt(5 / Math.PI)
     * 7: -1/2 * Math.sqrt(15 / Math.PI)
     * 8: 1/4 * Math.sqrt(15 / Math.PI)
     */

    /**
     * Convolution kernel
     *
     * 0: Math.PI
     * 1: (2 * Math.PI) / 3
     * 2: Math.PI / 4
     */

    const src = sh.coefficients;

    // l0
    out[0] = src[0] * 0.886227; // kernel0 * basis0 = 0.886227
    out[1] = src[1] * 0.886227;
    out[2] = src[2] * 0.886227;

    // l1
    out[3] = src[3] * -1.023327; // kernel1 * basis1 = -1.023327;
    out[4] = src[4] * -1.023327;
    out[5] = src[5] * -1.023327;
    out[6] = src[6] * 1.023327; // kernel1 * basis2 = 1.023327
    out[7] = src[7] * 1.023327;
    out[8] = src[8] * 1.023327;
    out[9] = src[9] * -1.023327; // kernel1 * basis3 = -1.023327
    out[10] = src[10] * -1.023327;
    out[11] = src[11] * -1.023327;

    // l2
    out[12] = src[12] * 0.858086; // kernel2 * basis4 = 0.858086
    out[13] = src[13] * 0.858086;
    out[14] = src[14] * 0.858086;
    out[15] = src[15] * -0.858086; // kernel2 * basis5 = -0.858086
    out[16] = src[16] * -0.858086;
    out[17] = src[17] * -0.858086;
    out[18] = src[18] * 0.247708; // kernel2 * basis6 = 0.247708
    out[19] = src[19] * 0.247708;
    out[20] = src[20] * 0.247708;
    out[21] = src[21] * -0.858086; // kernel2 * basis7 = -0.858086
    out[22] = src[22] * -0.858086;
    out[23] = src[23] * -0.858086;
    out[24] = src[24] * 0.429042; // kernel2 * basis8 = 0.429042
    out[25] = src[25] * 0.429042;
    out[26] = src[26] * 0.429042;

    return out;
  }
}
