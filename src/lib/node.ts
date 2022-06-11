import { mat3, mat4, quat, vec3, vec4 } from 'gl-matrix';

export class Node {
  static DefaultUp: vec3 = [0, 1, 0]; // 默认相机的up方向
  public id: string;
  _parent: Node;
  _children: Node[] = [];
  _visible: boolean;
  _type: string;
  _matrix: mat4 = mat4.create();
  _normalMatrix: mat3 = mat3.create(); // 法向量矩阵
  _matrixWorld: mat4 = mat4.create(); // 世界矩阵
  _modelViewProjectMatrix: mat4 = mat4.create(); // 最终的矩阵 投影矩阵*视场矩阵*世界矩阵
  position: vec3; // 位置
  quaternion: vec4; // 四元数
  scale: vec3; // 缩放
  matrixWorldNeedsUpdate: boolean = false;
  matrixAutoUpdate: boolean = false;
  up: vec3; // 相机的上方向

  private _isInitGalaxy: boolean = false;
  protected _useGalaxy: boolean = false;
  protected _options: any;
  protected _disposed: boolean;
  constructor(type: string) {
    this._type = type;
    this._children = [];
    this._visible = false; // 是否需要绘制
    this._parent = null;
    this.up = vec3.clone(Node.DefaultUp); // 摄像机的上向量
    this.scale = [1, 1, 1];
    this.position = vec3.create();
    this.quaternion = quat.create();
  }

  get children(): Node[] {
    return this._children;
  }

  get parent(): Node {
    return this._parent;
  }

  set parent(object: Node) {
    this._parent = object;
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(visible: boolean) {
    this._visible = visible;
  }

  get type(): string {
    return this._type;
  }

  set type(type: string) {
    this._type = type;
  }

  add(object: any) {
    // 传入数组的情况
    if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; i++) {
        this.add(arguments[i]);
      }
      return this;
    }
    if (object === this) {
      console.error("Object3D.add: object can't be added as a child of itself.", object);
      return this;
    }
    if (object) {
      if (object.parent !== null) {
        object.parent.remove(object);
      }
      object.parent = this;
      this.children.push(object);
    } else {
      console.error('Object3D.add: object not an instance of Object3D.', object);
    }
    return this;
  }

  remove(object) {
    if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; i++) {
        this.remove(arguments[i]);
      }
      return this;
    }
    const index = this.children.indexOf(object);
    if (index !== -1) {
      object.parent = null;
      this.children.splice(index, 1);
    }
    return this;
  }

  removeFromParent() {
    const parent = this.parent;
    if (parent !== null) {
      parent.remove(this);
    }
    return this;
  }

  applyMatrix4(matrix) {
    if (this.matrixAutoUpdate) this.updateMatrix();
    mat4.multiply(this._matrix, matrix, this._matrix);
    mat4.getScaling(this.scale, this._matrix);
    mat4.getRotation(this.quaternion, this._matrix);
    mat4.getTranslation(this.position, this._matrix);
    this.matrixWorldNeedsUpdate = true;
  }

  updateMatrix() {
    mat4.fromRotationTranslationScale(this._matrix, this.quaternion, this.position, this.scale);
    this.matrixWorldNeedsUpdate = true;
  }

  // 更新节点的世界矩阵
  updateMatrixWorld(force?: boolean) {
    if (this.matrixAutoUpdate) this.updateMatrix();

    if (this.matrixWorldNeedsUpdate || force) {
      if (!this.parent) {
        this._matrixWorld = mat4.clone(this._matrix);
      } else {
        mat4.multiply(this._matrixWorld, this.parent._matrixWorld, this._matrix);
      }
      // 关闭下次更新变化矩阵
      this.matrixWorldNeedsUpdate = false;
      // 通过对世界矩阵求逆并转置获取稳定的 3*3 的法向量矩阵 用于光照
      mat3.normalFromMat4(this._normalMatrix, this._matrixWorld);
      force = true;
    }

    // update children
    const children = this.children;
    for (let i = 0, l = children.length; i < l; i++) {
      children[i].updateMatrixWorld(force);
    }
  }

  updateWorldMatrix(updateParents, updateChildren) {
    const parent = this.parent;
    if (updateParents === true && parent !== null) {
      parent.updateWorldMatrix(true, false);
    }

    if (this.matrixAutoUpdate) this.updateMatrix();

    if (!this.parent) {
      this._matrixWorld = mat4.clone(this._matrix);
    } else {
      mat4.multiply(this._matrixWorld, this.parent._matrixWorld, this._matrix);
    }
    mat3.normalFromMat4(this._normalMatrix, this._matrixWorld);

    // update children
    if (updateChildren === true) {
      const children = this.children;
      for (let i = 0, l = children.length; i < l; i++) {
        children[i].updateWorldMatrix(false, true);
      }
    }
  }

  updateMVP(camera: any) {
    mat4.multiply(this._modelViewProjectMatrix, camera.viewProjectionMatrix, this._matrixWorld);
  }

  targetTo(target: vec3) {
    // this.updateMatrixWorld(true);
    const position = vec3.create();
    mat4.getTranslation(position, this._matrixWorld);
    mat4.targetTo(this._matrixWorld, position, target, [0, 1, 0]);
  }

  lookAt(target: vec3) {
    // This method does not support objects having non-uniformly-scaled parent(s)
    const _target = vec3.create();
    vec3.copy(_target, target);
    const _position = this.position;
    const _m1 = mat4.create();
    const _m2 = mat3.create();
    if (this._type === 'Camera' || this._type === 'Light') {
      mat4.lookAt(_m1, _position, _target, this.up);
    } else {
      mat4.lookAt(_m1, _target, _position, this.up);
    }
    mat3.fromMat4(_m2, _m1);
    quat.fromMat3(this.quaternion, _m2);
    quat.invert(this.quaternion, this.quaternion);
    const parent = this.parent;
    if (parent) {
      const _q1 = quat.create();
      const tmpM3 = mat3.create();
      mat3.fromMat4(tmpM3, parent._matrixWorld);
      quat.fromMat3(_q1, tmpM3);
      quat.invert(_q1, _q1);
      quat.mul(this.quaternion, _q1, this.quaternion);
    }

    this.updateMatrix();
  }

  public dispose() {
    if (this._disposed) {
      return;
    }
    const children = this._children;
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].dispose();
    }
    this.removeFromParent();
    this._children = [];
    this._disposed = true;
  }

  get normalMatrix() {
    return this._normalMatrix;
  }

  /**
   * TODO 一下代码是测试galaxy的代码,后续优化一下结构
   */

  get useGalaxy() {
    return this._useGalaxy;
  }

  getWorldForward(forward: vec3): vec3 {
    const e = this._matrixWorld;
    // Logger.info('getWorldForward', e);
    forward = [-e[8], -e[9], -e[10]];
    vec3.normalize(forward, forward); // 归一化
    return forward;
  }
  // 获取该node 的反转矩阵
  public getInvertMatrix() {
    const mat = mat4.create();
    mat4.invert(mat, this._matrixWorld);
    return mat;
  }

  // 递归遍历所有子节点 参数是一个方法
  public traverse(onload) {
    onload(this);
    const children = this.children;
    for (let i = 0, l = children.length; i < l; i++) {
      children[i].traverse(onload);
    }
  }
}
