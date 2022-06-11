import { Camera } from '../camera';
import { Node } from '../node';
import { Scene } from '../scene';
import { RenderList } from './list';
import { RenderMode, WebglRenderer } from './webgl';

export class SceneRenderer {
  private _webglRenderer: WebglRenderer;
  private _canvas: any;
  private _currentScence: Scene;
  private _currentCamera: Camera;

  private _renderList: RenderList;

  constructor(canvas: any, scene: Scene, camera?: Camera, option: any = {}) {
    if (option.renderMode === undefined) {
      option.renderMode = RenderMode.WebGL2;
    }
    this._webglRenderer = new WebglRenderer(option, canvas);
    this._currentScence = scene;
    this._canvas = canvas;
    this._renderList = new RenderList();
    this._currentCamera = camera;
    // this.resizeCanvas(canvas.width, canvas.height);
  }

  public render(framId: number) {
    const camera = this._currentCamera;
    if (!camera) return;
    const gl = this.webglRenderer.gl;
    // gl.clearColor(0.2, 1, 0.2, 0.2);
    // 清理颜色和深度缓存
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 更新object世界变换矩阵
    this.scene.updateMatrixWorld();

    // 更新camera相关
    camera.update(this.webglRenderer);

    // 渲染背景
    if (this.scene.background) {
      const sky = this.scene.background.sky;
      this.renderObject(sky, 0);
    }

    // 排序 TODO 后续放入wasm
    this._renderList.init();
    this._projectObject(this.scene);
    this._renderList.sort();
    const opaqueObjects = this._renderList.opaqueList; // 不透明物体
    const transparentObjects = this._renderList.transparentList; // 透明物体
    if (opaqueObjects.length > 0) this.renderObjects(opaqueObjects, framId);
    if (transparentObjects.length > 0) this.renderObjects(transparentObjects, framId);
  }

  public renderObjects(renderList: Node[], framId: number) {
    const length = renderList.length;
    for (let i = 0; i < length; i++) {
      if (renderList[i].visible) {
        const object = renderList[i];
        if (i === length - 1) {
          this.renderObject(object, framId, true);
        } else {
          this.renderObject(object, framId);
        }
      }
    }
  }

  public renderObject(object: any, framId: number, tail?: boolean) {
    switch (object.type) {
      case 'Sprite':
        this._currentCamera.uploadUniforms(object); // 在相机中更新 矩阵和法向量
        this._webglRenderer.setRenderStateByShader((object as any).shader);
        this._webglRenderer.render(object);
        break;
      case 'Line':
        this._currentCamera.uploadUniforms(object);
        this._webglRenderer.setRenderStateByShader((object as any).shader);
        this._webglRenderer.render(object);
        break;
      case 'Stuff':
        this._currentScence.lightManager.updateShaderData(object.shader, tail);
        this._currentScence.ambientLight?.updateShaderData(object.shader, tail);
        this._currentCamera.uploadUniforms(object);
        this._webglRenderer.setRenderStateByShader((object as any).shader);
        this._webglRenderer.render(object);
        break;
      default:
        break;
    }
  }

  private _projectObject(object: Node, camera?) {
    if (object.visible === false) return;
    if (object.type === 'Camera') {
      if (!this._currentCamera) {
        this._currentCamera = object as any;
      }
      // eslint-disable-next-line prettier/prettier
    } else if (object.type === 'Sprite' || object.type === 'Stuff' || object.type === 'Line' || object.type === 'Galaxy') {
      if (object.visible) {
        this._renderList.push(object);
      }
    }
    const children = object.children;
    for (let i = 0, l = children.length; i < l; i++) {
      this._projectObject(children[i], camera);
    }
  }


  public setOriginEnv(force?: boolean) {
    this.webglRenderer.switch2WebglEnv(force);
  }

  public resizeCanvas(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    if (this._currentCamera) {
      this._currentCamera.viewport = [0, 0, width, height];
    }
    // this._webglRenderer.viewport(0, 0, width, height);
  }

  get webglRenderer() {
    return this._webglRenderer;
  }

  get scene() {
    return this._currentScence;
  }

  set scene(value: Scene) {
    this._currentScence = value;
  }

  get canvas() {
    return this._canvas;
  }
}
