 import { vec3 } from 'gl-matrix';

 export class MathUtil {
   private static zeroTolerance = 1e-6;
   private static radToDegreeFactor = 180 / Math.PI;
   private static degreeToRadFactor = Math.PI / 180;
   static clamp(v, min, max) {
     return Math.max(min, Math.min(max, v));
   }
 
   static equals(a, b) {
     return Math.abs(a - b) <= MathUtil.zeroTolerance;
   }
 
   static isPowerOf2 = function isPowerOf2(v) {
     return (v & (v - 1)) === 0;
   };
 
   static radianToDegree(r) {
     return r * this.radToDegreeFactor;
   }

   static degreeToRadian(d) {
     return d * this.degreeToRadFactor;
   }
 
   static pointInBoundingBox(pos, min, max) {
     const xmin = min[0];
     const ymin = min[1];
     const xmax = max[0];
     const ymax = max[1];
     // 射线处于包围盒内
     if (pos[0] >= xmin && pos[0] <= xmax && pos[1] >= ymin && pos[1] <= ymax) {
       return true;
     }
     return false;
   }
 
   static clampLength(out: vec3, min: number, max: number) {
     const length = vec3.length(out);
     vec3.scale(out, out, 1 / (length || 1));
     vec3.scale(out, out, Math.max(min, Math.min(max, length)));
   }
 
   static setFromSphericalCoords(out: vec3, radius, phi, theta) {
     const sinPhiRadius = Math.sin(phi) * radius;
     out[0] = sinPhiRadius * Math.sin(theta);
     out[1] = Math.cos(phi) * radius;
     out[2] = sinPhiRadius * Math.cos(theta);
     return out;
   }
 
   static pointInPolygon(x: number, y: number, corners: any, startX?: number, startY?: number): boolean {
     let tMinX = 0;
     let tMinY = 0;
 
     if (startX === undefined || startY === undefined) {
       for (let tI = 0; tI < corners.length; tI++) {
         tMinX = Math.min(tMinX, corners[tI].x);
         tMinY = Math.min(tMinX, corners[tI].y);
       }
       startX = tMinX - 10;
       startY = tMinY - 10;
     }
 
     let tIntersects = 0;
     for (let tI = 0; tI < corners.length; tI++) {
       const tFirstCorner = corners[tI];
       let tSecondCorner;
       if (tI === corners.length - 1) {
         tSecondCorner = corners[0];
       } else {
         tSecondCorner = corners[tI + 1];
       }
 
       if (this.lineLineIntersect(startX, startY, x, y, tFirstCorner.x, tFirstCorner.y, tSecondCorner.x, tSecondCorner.y)) {
         tIntersects++;
       }
     }
     // odd intersections means the point is in the polygon
     return tIntersects % 2 === 1;
   }
 
   /** */
   static lineLineIntersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
     const tP1 = { x: x1, y: y1 };
     const tP2 = { x: x2, y: y2 };
     const tP3 = { x: x3, y: y3 };
     const tP4 = { x: x4, y: y4 };
     return this.tCCW(tP1, tP3, tP4) !== this.tCCW(tP2, tP3, tP4) && this.tCCW(tP1, tP2, tP3) !== this.tCCW(tP1, tP2, tP4);
   }
 
   static tCCW(p1: any, p2: any, p3: any) {
     const tA = p1.x;
     const tB = p1.y;
     const tC = p2.x;
     const tD = p2.y;
     const tE = p3.x;
     const tF = p3.y;
     return (tF - tB) * (tC - tA) > (tD - tB) * (tE - tA);
   }
 
   static generateUUID() {
     // eslint-disable-next-line no-undef
     return (crypto as any).randomUUID().toUpperCase();
   }
 }
 