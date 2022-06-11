import { vec3, vec4 } from 'gl-matrix';
import { Light } from './light';

export class PointLight extends Light {
  private static _colorProperty: any = 'u_PointLightColor';
  private static _distanceProperty: any = 'u_PointLightDistance';
  private static _positionProperty: any = 'u_PointLightPosition';
  lightIndex: number;

  private static _combinedData = {
    color: new Float32Array(3 * Light._maxLight),
    position: new Float32Array(3 * Light._maxLight),
    distance: new Float32Array(Light._maxLight)
  };

  constructor(color, intensity) {
    super(color, intensity);
    this.type = 'PointLight';
  }

  /** Light color. */
  color: vec4 = [1, 1, 1, 1];
  /** Light intensity. */
  intensity: number = 1.0;
  /** Defines a distance cutoff at which the light's intensity must be considered zero. */
  distance: number = 10;

  private _lightColor: vec4 = [1, 1, 1, 1];

  /**
   * @internal
   */
  static _updateShaderData(shader: any): void {
    const data = PointLight._combinedData;
    shader.updateUniformsData(PointLight._colorProperty, data.color);
    shader.updateUniformsData(PointLight._positionProperty, data.position);
    shader.updateUniformsData(PointLight._distanceProperty, data.distance);
  }

  /**
   * 获取最终点光源颜色
   */
  get lightColor(): vec4 {
    this._lightColor[0] = this.color[0] * this.intensity;
    this._lightColor[1] = this.color[1] * this.intensity;
    this._lightColor[2] = this.color[2] * this.intensity;
    this._lightColor[3] = this.color[3] * this.intensity;
    return this._lightColor;
  }

  /**
   * @internal
   */
  _appendData(lightIndex: number): void {
    this.lightIndex = lightIndex;
    const colorStart = lightIndex * 3;
    const positionStart = lightIndex * 3;
    const distanceStart = lightIndex;

    const lightColor = this.lightColor;
    const lightPosition = this.position;

    const data = PointLight._combinedData;

    data.color[colorStart] = lightColor[0];
    data.color[colorStart + 1] = lightColor[1];
    data.color[colorStart + 2] = lightColor[2];
    data.position[positionStart] = lightPosition[0];
    data.position[positionStart + 1] = lightPosition[1];
    data.position[positionStart + 2] = lightPosition[2];
    data.distance[distanceStart] = this.distance;
  }

  updatePosition(position: vec3): void {
    if (this.lightIndex === undefined) {
      return;
    }
    this.position = position;
    const data = PointLight._combinedData;
    const positionStart = this.lightIndex * 3;
    data.position[positionStart] = position[0];
    data.position[positionStart + 1] = position[1];
    data.position[positionStart + 2] = position[2];
  }
}
