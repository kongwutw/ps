import { mat4, vec4, vec2, vec3 } from 'gl-matrix';

import { Node } from './node';
import { WebglRenderer } from '../render/renderer/webgl.renderer';

export interface projectOptions {
  fov: number;
  near: number;
  far: number;
}

export class Camera extends Node {
  private _orthographicSize: number = 1;
  private _projectionMatrix: mat4 = mat4.create();
  private _nearClipPlane: number = 0.01;
  private _farClipPlane: number = 1000;
  private _viewMatrix: mat4 = mat4.create();
  private _viewProjectMatrix: mat4 = mat4.create();
  private _viewport: vec4 = [0, 0, 1, 1];
  private _lastAspectSize: vec2 = vec2.create();
  protected _vpMatrixNeedsUpdate: boolean = false;
  public isOrthographic: boolean = true;
  public needsUpdate: boolean = false;
  public vMatrixNeedsUpdate: boolean = false;
  public pMatrixNeedsUpdate: boolean = false;

  public projectOptions: projectOptions = {
    fov: Math.PI / 2, // 视锥角度
    near: 0.1, // 视锥近切割面
    far: 1000 // 视锥远切割面
  };

  private _canvas: any;

  constructor(canvas: any) {
    super('Camera');
    this._canvas = canvas;
    this.viewport = [0, 0, canvas.width, canvas.height];
    this.vMatrixNeedsUpdate = true;
    this.pMatrixNeedsUpdate = true;
  }

  lookAt(target: vec3) {
    super.lookAt(target);
    this.vMatrixNeedsUpdate = true;
  }

  updateMatrixWorld(force?: boolean) {
    super.updateMatrixWorld(force);
  }

  /**
   * 更新camera
   * 1. 更新viewPort
   * 2. 更新viewMatrix
   * 3. 更新ProjectionMatrix
   */
  update(renderer: WebglRenderer) {
    renderer.viewport(this.viewport[0], this.viewport[1], this.viewport[2], this.viewport[3]);

    this._updateViewMatrix();
    this._updateProjectionMatrix();
    this._updateViewProjectionMatrix();
  }

  uploadUniforms(object: Node) {
    if ((<any>object).shader) {
      const shader = (<any>object).shader;
      shader.updateUniformsData('u_VMat', this.viewMatrix);
      shader.updateUniformsData('u_PMat', this.projectionMatrix);
      shader.updateUniformsData('u_CameraPos', this.position);
      object.updateMVP(this);
      shader.updateUniformsData('u_MMat', object._matrixWorld);
      shader.updateUniformsData('u_NMat', object._normalMatrix);
      shader.updateUniformsData('u_MVPMat', object._modelViewProjectMatrix);
    }
  }

  protected _updateViewMatrix() {
    if (!this.vMatrixNeedsUpdate) return;

    mat4.invert(this._viewMatrix, this._matrixWorld); // 更新视场矩阵 是node的世界矩阵的逆矩阵
    this.vMatrixNeedsUpdate = false;
    this._vpMatrixNeedsUpdate = true;
  }

  protected _updateProjectionMatrix() {
    if (!this.pMatrixNeedsUpdate && this._lastAspectSize[0] === this._canvas.width && this._lastAspectSize[1] === this._canvas.height) {
      return;
    }
    this._lastAspectSize[0] = this._canvas.width;
    this._lastAspectSize[1] = this._canvas.height;
    const aspectRatio = this.aspectRatio;
    if (!this.isOrthographic) {
      const aspect = this._lastAspectSize[0] / this._lastAspectSize[1];
      mat4.perspective(this._projectionMatrix, this.projectOptions.fov, aspect, this.projectOptions.near, this.projectOptions.far); // 透射视锥矩阵
    } else {
      const width = this._orthographicSize * aspectRatio;
      const height = this._orthographicSize;
      mat4.ortho(this._projectionMatrix, -width, width, -height, height, this._nearClipPlane, this._farClipPlane);
    }
    this.pMatrixNeedsUpdate = false;
    this._vpMatrixNeedsUpdate = true;
  }

  protected _updateViewProjectionMatrix() {
    if (!this._vpMatrixNeedsUpdate) return;
    mat4.multiply(this._viewProjectMatrix, this.projectionMatrix, this.viewMatrix);
    this._vpMatrixNeedsUpdate = false;
  }

  public dispose(): void {
    this._canvas = null;
    this.projectOptions = null;

    super.dispose();
  }

  /**
   * Half the size of the camera in orthographic mode. 正交模式下相机大小
   */
  get orthographicSize(): number {
    return this._orthographicSize;
  }

  set orthographicSize(value: number) {
    this._orthographicSize = value;
  }

  get viewMatrix(): Readonly<mat4> {
    return this._viewMatrix;
  }

  set projectionMatrix(value: mat4) {
    this._projectionMatrix = value;
  }

  get unProjectionMatrix() {
    const temp = mat4.create();
    mat4.invert(temp, this.projectionMatrix);
    return temp;
  }

  get projectionMatrix(): mat4 {
    return this._projectionMatrix;
  }

  get aspectRatio(): number {
    const canvas = this._canvas;
    return (canvas.width * this._viewport[2]) / (canvas.height * this._viewport[3]);
  }

  get viewProjectionMatrix(): mat4 {
    return this._viewProjectMatrix;
  }

  get viewport() {
    return this._viewport;
  }

  set viewport(data) {
    this._viewport = data;
    this.pMatrixNeedsUpdate = true;
  }
}
