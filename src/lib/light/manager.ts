import { Light } from './light';
import { PointLight } from './point';
import { DirectLight } from './direct';

import { ShaderMacro } from '../render/shaders/macro/shader.macro';
import { BasicShader } from '../render/shaders/shader.basic';

export class LightManager {
  private _needsUpdate = false;
  visibleLights: Light[];

  constructor() {
    this.visibleLights = [];
  }

  /**
   * 添加光源
   * @param light
   */
  attachRenderLight(light: Light): void {
    const index = this.visibleLights.indexOf(light);
    if (index === -1) {
      this.visibleLights.push(light);
      this._needsUpdate = true;
    } 
  }

  /**
   * 删除光源
   * @param light
   */
  detachRenderLight(light: Light): void {
    const index = this.visibleLights.indexOf(light);
    if (index !== -1) {
      this.visibleLights.splice(index, 1);
      this._needsUpdate = true;
    }
  }

  // 渲染循环内部不停调用
  updateShaderData(shader: BasicShader, tail?: boolean) {
    if (!this._needsUpdate) return;
    /**
     * ambientLight and envMapLight only use the last one in the scene
     * */
    let directLightCount = 0;
    let pointLightCount = 0;

    const lights = this.visibleLights;
    for (let i = 0, len = lights.length; i < len; i++) {
      const light = lights[i];
      if (light instanceof DirectLight) {
        light._appendData(directLightCount++);
      } else if (light instanceof PointLight) {
        light._appendData(pointLightCount++);
      }
    }
    // TODO 优化：根据不同的光源类型进行update节约算力
    // 修改Macro / Defines 因为更新了宏，就相当于重新创建了一个shaderProgram。
    if (directLightCount) {
      DirectLight._updateShaderData(shader);
      const macro = new ShaderMacro('DIRECT_LIGHT_COUNT', directLightCount);
      shader.addMacro(macro);
    } else {
      shader.removeMacro('DIRECT_LIGHT_COUNT');
      // 因为切换program 参数内存地址会变化
      shader.makeAllAvailable();
    }
    if (pointLightCount) {
      PointLight._updateShaderData(shader);
      const macro = new ShaderMacro('POINT_LIGHT_COUNT', pointLightCount);
      shader.addMacro(macro);
    } else {
      shader.removeMacro('POINT_LIGHT_COUNT');
      // 因为切换program 参数内存地址会变化
      shader.makeAllAvailable();
    }
    if (tail) {
      this._needsUpdate = false;
    }
  }

  get needsUpdate() {
    return this._needsUpdate;
  }

  set needsUpdate(value) {
    this._needsUpdate = value;
  }
}
