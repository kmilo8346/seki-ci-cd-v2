export interface ITimer {
  stop() : void,
  inMiliseconds(): number,
  inSeconds(): number,
  inMinutes():number,
  toString(): string
}