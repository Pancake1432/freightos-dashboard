/** Full multi-stop route data — produced by MapTool, consumed by ETAPredictor */
export interface MultiStopRouteData {
  points: Array<{
    name:          string
    isOrigin:      boolean
    isDestination: boolean
  }>
  legs: Array<{
    from:  string
    to:    string
    miles: number
  }>
  totalMiles: number
}

/** Simple two-point route — used when user types cities in ETAPredictor directly */
export interface SharedRoute {
  originName: string
  destName:   string
  originLat:  number
  originLng:  number
  destLat:    number
  destLng:    number
  miles:      number
}
