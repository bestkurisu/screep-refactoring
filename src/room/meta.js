'use strict'

const quadrantMap={
    0: {
        x: 'E',
        y: 'N'
    },
    1: {
        x: 'E',
        y: 'S'
    },
    2: {
        x: 'W',
        y: 'S'
    },
    3: {
        x: 'W',
        y: 'N'
    }
}
Room.seralizeName=function(name){
    if(name === 'sim'){
        return 'sim'
    }
    const coords=Room.getCoordinates(name)
    let quad
    if(quad=coords.x_dir === 'E'){
        quad=coords.y_dir === 'N'?'0':'1'
    }
    else{
        quad=coords.y_dir === 'S'?'2':'3'
    }
    const x=String.fromCodePoint(+coords.x + +unicodeModifier)
    const y=String.fromCodePoint(+coords.y + +unicodeModifier)
    return `${quad}${x}${y}`
}
Room.deserializeName=function(sName){
    if (sName === 'sim') {
        return 'sim'
    }
    const xDir=quadrantMap[sName[0]].x
    const yDir=quadrantMap[sName[0]].y
    const x=sName.codePointAt(1) - unicodeModifier
    const y=sName.codePointAt(2) - unicodeModifier
    return `${xDir}${x}${yDir}${y}`
}
Room.getCoordinates=function(name){
    const coordinateRegex=/(E|W)(\d+)(N|S)(\d+)/g
    const match=coordinateRegex.exec(name)
    return {
        x: +match[2],
        y: +match[4],
        x_dir: match[1],
        y_dir: match[3]
    }
}
Room.getRandomRoomInRange=function(name, range){
    const bounds=getRoomRangeBounds(name, range)
    const x=_.random(bounds.lowerX, bounds.upperX)
    const y=_.random(bounds.lowerY, bounds.upperY)
    return convertToRoomname(x, y, bounds.startXdir, bounds.startYdir)
}
Room.getRoomsInRange=function(name, range){
    if(name === 'sim'){
        return []
    }
    const bounds=getRoomRangeBounds(name, range)
    const rooms=[]
    for(var x=bounds.lowerX; x <= bounds.upperX; x++) {
        for (var y=bounds.lowerY; y <= bounds.upperY; y++) {
            rooms.push(convertToRoomname(x, y, bounds.startXdir, bounds.startYdir))
        }
    }
    return rooms
}
Room.getManhattanDistance=function(startRoomName, endRoomName){
    const startCoords=Room.getCoordinates(startRoomName)
    const endCoords=Room.getCoordinates(endRoomName)
    let score=Math.abs(startCoords.x-endCoords.x)+Math.abs(startCoords.y-endCoords.y)
    if(startCoords.x_dir !== endCoords.x_dir){
        score++
    }
    if(startCoords.y_dir !== endCoords.y_dir){
        score++
    }
    return score
}
Room.isSourcekeeper=function(name){
    if(name === 'sim'){
        return true
    }
    const coords=Room.getCoordinates(name)
    const xMod=coords.x % 10
    const yMod=coords.y % 10
    return xMod >= 4 && xMod <= 6 && yMod >= 4 && yMod <= 6
}
Room.isHallway=function(name) {
    if(name === 'sim'){
        return false
    }
    const coords=Room.getCoordinates(name)
    const xMod=coords.x % 10
    const yMod=coords.y % 10
    return xMod === 0 || yMod === 0
}
Room.isClaimable=function(name){
    if(!Game.map.isRoomAvailable(name)){
        return false
    }
    if(name === 'sim'){
        return false
    }
    const coords = Room.getCoordinates(name)
    const xMod = coords.x % 10
    const yMod = coords.y % 10
    if (xMod >= 4 && xMod <= 6 && yMod >= 4 && yMod <= 6) {
        return false
    }
    return yMod !== 0 && xMod !== 0
}
Room.isCuldesac=function(roomName, entrance){
    const exits=Game.map.describeExits(roomName)
    return Object.keys(exits).length === 1
}
function getRoomRangeBounds(name, range){
    const worldsize=Game.map.getWorldSize()
    let maxValue=worldsize
  
    if (Game.shard && Game.shard.name.startsWith('shard')) {
        maxValue=(worldsize - 2)/2
    }
  
    const coords=Room.getCoordinates(name)
    const startXdir=coords.x_dir
    const startYdir=coords.y_dir
    const left=coords.x - range
    const right=+coords.x + +range
    const top=coords.y - range
    const bottom=+coords.y + +range
    const lowerX=Math.min(left, right)
    const upperX=Math.min(Math.max(left, right), maxValue)
    const lowerY=Math.min(top, bottom)
    const upperY=Math.min(Math.max(top, bottom), maxValue)
    return {
        lowerX,
        upperX,
        lowerY,
        upperY,
        startXdir,
        startYdir
    }
}
function convertToRoomname(x, y, startXdir, startYdir){
    let xNorm, xdir
    if(x<0){
        xNorm=Math.abs(x)-1
        xdir=startXdir === 'E'?'W':'E'
    } 
    else{
        xNorm=x
        xdir=startXdir
    }
    let yNorm, ydir
    if(y<0){
        yNorm=Math.abs(y)-1
        ydir=startYdir === 'N'?'S':'N'
    }
    else{
        yNorm=y
        ydir=startYdir
    }
    return xdir+xNorm+ydir+yNorm
}
Room.prototype.getSuicideBooth=function(){
    if(!this.spawn || !this.spawn.length){
        return false
    }
    let spawn=this.spawn[0]
    if(this.storage){
        spawn=this.storage.pos.findClosestByRange(this.spawn)
    }
    return new RoomPosition(spawn.pos.x - 1, spawn.pos.y, spawn.room.name)
}
Room.prototype.getFactotumHome=function(){
    if(this.storage){
        return this.getPositionAt(this.storage.pos.x-1, this.storage.pos.y+1)
    } 
    else{
        const suicideBooth=this.getSuicideBooth()
        return this.getPositionAt(suicideBooth.pos.x, suicideBooth.pos.y-1)
    }
}
Room.prototype.getStructuresToFill=function(structureTypes){
    if(!this.__fillable){
        this.__fillable=this.find(FIND_MY_STRUCTURES, {
            filter: function (structure){
                if(structureTypes.indexOf(structure.structureType) === -1){
                    return false
                }
                if(!structure.energyCapacity){
                    return false
                }
                return structure.energy < structure.energyCapacity
            }
        })
    }
    return this.__fillable
}
Object.defineProperty(Structure.prototype,'memory',{
    get(){
        return this.room.memory.objects[this.id]=this.room.memory.objects[this.id] || {}
    }
})