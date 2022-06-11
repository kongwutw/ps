import { AmbientLight } from './light/ambient';
import { LightManager } from './light/manager';
import { Node } from './node';

export class Scene extends Node {
  public lightManager: LightManager;
  // 整个场景只能有一个环境光
  private _ambientLight: AmbientLight;

  // 场景的背景
  public background: any;

  constructor() {
    super('Scene');
    this.visible = true;
    this.lightManager = new LightManager();
  }

  /**
   * Ambient light.
   */
  get ambientLight(): AmbientLight {
    return this._ambientLight;
  }

  set ambientLight(value: AmbientLight) {
    if (!value) {
      return;
    }
    const lastAmbientLight = this._ambientLight;
    if (lastAmbientLight !== value) {
      this._ambientLight = value;
      this._ambientLight.needsUpdate = true;
    }
  }

  public dispose() {
    if (this._disposed) {
      return;
    }
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].dispose();
    }
    this._children = [];
    this._disposed = true;
  }

  public add(object: any) {
    if (object.type === 'DirectionalLight' || object.type === 'PointLight') {
      this.lightManager.attachRenderLight(object);
    }
    if (object.type === 'Stuff') {
      this.lightManager.needsUpdate = true;
      if (this._ambientLight) {
        this._ambientLight.needsUpdate = true;
      }
    }
    return super.add(object);
  }

  public remove(object) {
    if (object.type === 'DirectionalLight' || object.type === 'PointLight') {
      this.lightManager.detachRenderLight(object);
    }
    return super.remove(object);
  }
}
