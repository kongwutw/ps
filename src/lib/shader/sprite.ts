import { BasicShader } from './shader.basic';
import { ShaderKey, WebglRenderer } from '../renderer/webgl.renderer';
import { Texture2D } from '../texture/texture.2d';
import { ShaderSpriteInfo } from './components/uniform/interfaces/shader.sprite.info';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './glsl/sprite.glsl';
import { AttributeSpriteInfoType } from './components/attribute/interfaces/attribute.sprite.info';
import { ShaderAttributeData } from './components/attribute/shader.attribute.data';
import { ShaderBasicInfo } from './components/uniform/interfaces/shader.basic.info';

export class SpriteShader extends BasicShader {
  protected _attributesDatas: Record<AttributeSpriteInfoType, ShaderAttributeData>;
  // protected declare _uniformsDatas: Record<ShaderSpriteInfoType, ShaderUniformData>;

  // eslint-disable-next-line no-useless-constructor
  constructor(name: string, texture2D: Texture2D, renderer: WebglRenderer, defines: any, vs?, fs?) {
    super(name, renderer, defines, vs || VERTEX_SHADER, fs || FRAGMENT_SHADER);
    if (texture2D) {
      this._texture2D = texture2D;
      super.updateUniformsData(ShaderBasicInfo.u_TEXTURE_0, texture2D);
    }
    if (this._uniformsDatas && (this._uniformsDatas as any).u_COLOR) {
      this.updateUniformsData(ShaderSpriteInfo.u_COLOR, [1.0, 1.0, 1.0, 1.0]);
    }
  }

  get texture2D() {
    return this._texture2D;
  }

  set texture2D(value: any) {
    if (this._texture2D) {
      this._texture2D.dispose();
    }
    // eslint-disable-next-line no-undef
    if (value instanceof Texture2D) {
      this._texture2D = value;
      super.updateUniformsData(ShaderBasicInfo.u_TEXTURE_0, this.texture2D);
    }
  }

  get uniformsData() {
    return this._uniformsDatas;
  }

  get attributesData() {
    return this._attributesDatas;
  }

  public dispose() {
    super.dispose();
    this._uniformsDatas = null;
    this._texture2D.dispose();
  }
}
