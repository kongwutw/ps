export class RenderList {
    private _opaqueList = [];
    private _transparentList = [];
  
    init() {
      this._opaqueList = [];
      this._transparentList = [];
    }
  
    push(object) {
      const material = object.shader;
      if (material) {
        if (material.transparent === true) {
          this._transparentList.push(object);
        } else {
          this._opaqueList.push(object);
        }
      }
    }
  
    sort() {
      if (this.opaqueList.length > 0) {
        this.opaqueList.sort((a, b) => (<any>a).renderOrder - (<any>b).renderOrder);
      }
      if (this.transparentList.length > 0) {
        this.transparentList.sort((a, b) => (b as any).renderOrder - (a as any).renderOrder);
      }
    }
  
    get opaqueList() {
      return this._opaqueList;
    }
  
    get transparentList() {
      return this._transparentList;
    }
  }
  