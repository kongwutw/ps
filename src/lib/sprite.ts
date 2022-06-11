import { vec2, vec3, mat4, quat } from 'gl-matrix';
import { Node } from './node';
import { SpriteShader } from './shader';
import { BoundingBox } from './bounding.box';
import { AttributeBasicInfo } from '../render/shaders/components/attribute/interfaces/attribute.basic.info';
import { BasicShader } from '../render/shaders/shader.basic';
import { Geometry } from './geometry';
import { Camera } from './camera';
import { Canvas } from './Canvas'

import { MathUtil } from '@/util/math';
import { SIDE } from '@/constants/constants';
import { Rect } from '@/constants/rect';

export interface SpriteOption {
    region?: Rect;
    pivot?: vec2; // 中心位置 0-1
    canvas?: Canvas;
}
/**
 * 精灵的实现，目前暂时固定尺寸和uv，存放临时数据以及业务逻辑
 */
export class Sprite extends Node {
    public static _rectangleTriangles: number[] = [0, 2, 1, 2, 0, 3];

    private _bounds: BoundingBox;
    private _canvas: Canvas;
    /**
     * 中转数据
     */
    private _triangles: number[];
    // 渲染顺序
    private _renderOrder: number = 0;

    // 纹理坐标
    private _uv: vec2[] = [vec2.create(), vec2.create(), vec2.create(), vec2.create()];
    // 顶点坐标
    private _positions: vec3[] = [vec3.create(), vec3.create(), vec3.create(), vec3.create()];

    // sprite的矩形边界
    private _region: Rect = new Rect(0, 0, 1, 1);

    protected _shader: BasicShader;
    // 每个单位 应该显示多少像素；应该是 画布高度的一半，因为near面的高度就是两个单位
    private _pixelsPerUnit: number = 512;
    // sprite的中心点 在裁剪空间的位置
    private _pivot: vec2 = [0.5, 0.5];

    public name: string;
    public numElements: number = 6;

    public geometry: Geometry;

    constructor(name: string, geometry: Geometry, shader: BasicShader, option: SpriteOption = {}) {
        super('Sprite');
        this.name = name;
        this._triangles = Sprite._rectangleTriangles;
        this.pivot = option.pivot || this._pivot;
        this.region = option.region || this._region;
        if (option.canvas) {
            this._canvas = option.canvas;
        }
        if (geometry) {
            this.geometry = geometry;
        }
        if (shader && geometry) {
            this._shader = shader as SpriteShader;
            this._shader.side = SIDE.DOUBLESIDE;
            this.updateSprite();
        }
        this._visible = true; // 是否被渲染
        this.matrixWorldNeedsUpdate = true;
    }

    /**
     * Location of the sprite's center point in the rectangle region, specified in normalized.
     */
    get pivot(): vec2 {
        return this._pivot;
    }

    set pivot(value: vec2) {
        vec2.set(this._pivot, MathUtil.clamp(value[0], 0, 1), MathUtil.clamp(value[1], 0, 1));
    }

    /**
     * The rectangle region of the sprite, specified in normalized.
     */
    get region(): Rect {
        return this._region;
    }

    set region(value: Rect) {
        const region = this._region;
        const x = MathUtil.clamp(value.x, 0, 1);
        const y = MathUtil.clamp(value.y, 0, 1);
        region.setValue(x, y, MathUtil.clamp(value.width, 0, 1 - x), MathUtil.clamp(value.height, 0, 1 - y));
    }

    get shader(): SpriteShader {
        return this._shader as SpriteShader;
    }

    set shader(value) {
        this._shader = value;
    }

    get renderOrder() {
        return this._renderOrder;
    }

    set renderOrder(value: number) {
        this._renderOrder = value;
    }

    get bounds() {
        return this._bounds;
    }

    public updateSprite() {
        this._updatePosition();
        this._updateUV();
        // this.shader.updateIndice(new Uint16Array(Sprite._rectangleTriangles));
        this.geometry.updateIndice(new Uint16Array(Sprite._rectangleTriangles));
        this.geometry.attributes.forEach(data => {
            this._shader.uploadAttributes(this.geometry.attributesData[data]);
        });
        this.geometry.numElements = 6;
    }

    public computeBoundingBox() {
        const position = this._positions;
        if (!this._bounds) {
            this._bounds = new BoundingBox();
        }
        this._bounds.fromPoints(Array.from(position));
        if (this._matrixWorld) {
            this._bounds.transform(this._matrixWorld);
        }
    }

    public _updatePosition() {
        const { width: regionW, height: regionH } = this._region;
        // Coordinates of the four boundaries.
        let textureW: number;
        let textureH: number;
        if (this._canvas) {
            // this._pixelsPerUnit = this._canvas.height / (window.devicePixelRatio * 2); //展示 css 像素
            this._pixelsPerUnit = this._canvas.height / 2; // 展示物理像素
        }
        const pPUReciprocal = 1.0 / this._pixelsPerUnit;
        // const pPUReciprocal = 1.0;
        if (!this.shader.texture2D) {
            textureW = 400 * pPUReciprocal;
            textureH = 300 * pPUReciprocal;
        } else {
            textureW = this.shader.texture2D.width * pPUReciprocal;
            textureH = this.shader.texture2D.height * pPUReciprocal;
        }
        const realRenderW = textureW * regionW;
        const realRenderH = textureH * regionH;
        const lx = -this._pivot[0] * realRenderW;
        const by = -this._pivot[1] * realRenderH;
        const rx = realRenderW + lx;
        const ty = realRenderH + by;
        // eslint-disable-next-line no-irregular-whitespace
        // Assign values ​​to _positions
        const positions = this._positions;
        // Top-left.
        vec3.set(positions[0], lx, ty, 0);
        // Top-right.
        vec3.set(positions[1], rx, ty, 0);
        // Bottom-right.
        vec3.set(positions[2], rx, by, 0);
        // Bottom-left.
        vec3.set(positions[3], lx, by, 0);
        const array = [];
        // this._triangles.forEach(triangle => {
        //   array.push(positions[triangle][0], positions[triangle][1], positions[triangle][2]);
        // });
        positions.forEach(pos => {
            array.push(pos[0], pos[1], pos[2]);
        });
        // console.log(array);
        this.geometry.updateAttributesData(AttributeBasicInfo.a_POSITION, new Float32Array(array), 3);
    }

    /**
     * @description: 移动
     * @param {*} x
     * @param {*} y
     * @param {*} camera
     * @return {*}
     */
    public move2Point(x, y, camera) {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, [x, y, 0.0]);
        this._matrixWorld = matrix;
        this.computeBoundingBox();
        this.updateMVP(camera);
    }
    /**
     * @description: 旋转、移动、缩放
     * @param {vec3} rotateOpt [x,y,z] degree
     * @param {vec3} translationOpt [x,y,z] 不是像素单位
     * @param {vec3} scaleOpt [x,y,z]
     * @return {*}
     */
    public rotationTranslationScale(rotateTo: vec3 | null, translationTo: vec3 | null, scaleTo: vec3 | null) {
        
        if(rotateTo){
            // const quatenion = quat.create();
            quat.fromEuler(this.quaternion, rotateTo[0], rotateTo[1], rotateTo[2]);
        }
        if(translationTo){
            this.position = translationTo;
        }
        if(scaleTo){
            this.scale = scaleTo;
        }
        this.updateMatrix();
    }

    /**
     * @description: 更新纹理坐标
     * @return {*}
     */
    public _updateUV() {
        const left = this._region.x;
        const top = this._region.y;
        const right = this._region.width + left;
        const bottom = this._region.height + top;

        // Top-left.
        vec2.set(this._uv[0], left, top);
        // Top-right.
        vec2.set(this._uv[1], right, top);
        // Bottom-right.
        vec2.set(this._uv[2], right, bottom);
        // Bottom-left.
        vec2.set(this._uv[3], left, bottom);
        const array = [];
        this._uv.forEach(uv => {
            array.push(uv[0], uv[1]);
        });
        this.geometry.updateAttributesData(AttributeBasicInfo.a_TEXCOORD_0, new Float32Array(array), 2);
    }

    get currentPositions() {
        const position = this._positions;
        const worldPos = [];
        position.forEach(pos => {
            const temp = vec3.create();
            vec3.transformMat4(temp, pos, this._matrixWorld);
            worldPos.push(temp);
        });
        return worldPos;
    }

    /**
     * @description: 计算精灵的像素坐标
     * @param {Camera} camera
     * @param {*} dom
     * @return {*}
     */    
    getMonitorPositions(camera: Camera, dom) {
        const worldPos = this.currentPositions;
        const result = [];
        worldPos.forEach(pos => {
            const temp = vec3.create();
            vec3.transformMat4(temp, pos, camera.viewMatrix);
            vec3.transformMat4(temp, temp, camera.projectionMatrix);
            const a = dom.clientWidth / 2;
            const b = dom.clientHeight / 2;
            const x = temp[0] * a + a; // 标准设备坐标转屏幕坐标
            const y = -temp[1] * b + b; // 标准设备坐标转屏幕坐标
            result.push([x, y]);
        });
        return result;
    }

    // updateMVP(camera: Camera) {
    //   // const cameraNeedsUpdate = !!camera.needsUpdate;
    //   super.updateMVP(camera);
    //   this._shader.updateUniformsData(ShaderBasicInfo.u_MVPMat, this._modelViewProjectMatrix);
    // }

    get pos() {
        return this._positions;
    }

    get pixelsPerUnit() {
        return this._pixelsPerUnit;
    }

    public dispose() {
        super.dispose();
        this._shader.dispose();
        this._bounds = null;
        return true;
    }
}
