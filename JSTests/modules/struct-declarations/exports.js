export default struct { x = 1; }
export struct Named { y = 2; }
export struct Extended extends Named { z = 3; sum() { return this.y + this.z; } }
