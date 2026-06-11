import type { components } from './generated-types'

export type Workspace = components['schemas']['Workspace']
export type Peer = components['schemas']['Peer']
export type Session = components['schemas']['Session']
export type Message = components['schemas']['Message']
export type Conclusion = components['schemas']['Conclusion']
export type PeerContext = components['schemas']['PeerContext']
export type RepresentationResponse = components['schemas']['RepresentationResponse']

export interface Page<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly page: number
  readonly size: number
  readonly pages: number
}
