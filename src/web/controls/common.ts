import * as R from 'ramda'
import m, { Vnode } from 'mithril'
import htm from 'htm'

import * as O from 'fp-ts/lib/Option'
import { Lens, Optional } from 'monocle-ts'
// import * as L from 'monocle-ts/lib/Lens'

export type ConsoleLog = {log: typeof console.log}
export type ConsoleWarn = {warn: typeof console.warn}

// Html syntax
export const html = htm.bind(m)

// Common styles

const labelBaseStyle = { 'font-size': '.8rem', padding: '2px 0 0 0', transition: 'all 1s' }

const styleShowHide  = (isVis: Boolean) => ({ opacity: isVis ? .65 : 0, height: isVis ? 'auto' : 0 })

export const labelStyle = (isVis: Boolean) => ({ style: {...labelBaseStyle, ...styleShowHide(isVis) } })

export const showRevDecimal = (amount: string) => {
  const d = 8 // decimal places
  const amountNr   = parseInt(amount)
  const amountStr  = isNaN(amountNr) ? '' : `${amountNr}`
  const length     = amountStr.length
  const trimZeroes = (s: string) => s.replace(/[\.]?[0]*$/ig, '')
  if (length === 0) return ''
  if (length <= d) {
    const padded = amountStr.padStart(d, '0')
    return trimZeroes(`0.${padded}`)
  } else if (length > d) {
    const prefix = amountStr.slice(0, -d)
    const suffix = amountStr.slice(-d)
    return trimZeroes(`${prefix}.${suffix}`)
  } else return ''
}

export const labelRev = (amount: string) =>
  amount && m('span.rev', amount, m('b', ' REV'))

export const showNetworkError = (errMessage: string) =>
  errMessage == 'Failed to fetch'
    ? `${errMessage}: select a running RNode from the above selector.`
    : errMessage

const idLens = <A>() => new Lens<A, A>(a => a, a => _ => a)

export interface Cell<State> {
  readonly view: (def?: Partial<State>) => State
  readonly set: (v: Partial<State>) => void
  readonly update: (f: (a: State) => State) => void
  readonly ol: <State1>(compLens: Lens<State, State1>) => Cell<State1>
  readonly o: <P extends keyof State>(prop: P) => Cell<State[P]>
  // readonly oo: <State1>(compLens: Optional<State, State1>) => Cell<State1>
}

interface CellWithListener<State> extends Cell<State> {
  setListener: (f: any) => void
}

// State cell
export const mkCell = <State>() => {
  let _stRef: State, _listener: (f: any) => void

  const stCell = function <State1>(lens: Optional<State, State1>): Cell<State1> {
    return <Cell<State1>>{
      view: (def?: Partial<State1>) => {
        const res = lens.getOption(_stRef)
        return O.option.reduce(res, def, (_, a) => R.isNil(a) ? def : a)
      },
      set: (v: State1) => {
        _stRef = lens.set(v)(_stRef)
        // Trigger event (render)
        _listener(_stRef)
      },
      update: (f: (a: State1) => State1) => {
        const s = lens.getOption(_stRef)
        _stRef = lens.modify(f)(_stRef)
        // Trigger event (render)
        _listener(_stRef)
      },
      // Compose lenses / make sub cells
      ol: <State2>(compLens: Lens<State1, State2>) => {
        const subLens = lens.composeLens(compLens)
        return stCell(subLens)
      },
      o: <P extends keyof State1>(prop: P) => {
        const compLens = Lens.fromProp<State1>()(prop)
        // const compLens = Optional.fromNullableProp<State1>()(prop)
        // const compLens = Optional.fromPath<State1>()([prop])
        const subLens = lens.composeLens(compLens)
        return stCell(subLens)
      },
      // oo: <State2>(compLens: Optional<State1, State2>) => {
      //   const subLens = lens.compose(compLens)
      //   return stCell(subLens)
      // },
    }
  }
  return {
    ...stCell(idLens<State>().asOptional()),
    // Set event (on-change) listener
    setListener: f => { _listener = f },
  } as CellWithListener<State>
}

// export type CtrlView = <S, E>(st: Cell<S>, actions: E) => Vnode<unknown, any> | m.Vnode<unknown, any>[]

export type CtrlView<S, E> = (st: Cell<S>, actions: E) => Vnode<unknown, any> | m.Vnode<unknown, any>[]

// Wraps Virtual DOM renderer to render state
export const makeRenderer = <S, Eff>(element: Element, view: CtrlView<S, Eff>) => (state: Partial<S>, actions: Eff) => {
  const stateCell = mkCell<S>()
  const render = () => {
    m.render(element, view(stateCell, actions))
  }
  stateCell.setListener(render)
  stateCell.set(state)
}

export type PageLogArgs = {document: Document} & ConsoleLog

export const pageLog = ({log, document}: PageLogArgs) => {
  // Page logger
  const logEL = document.querySelector('#log')
  const logWrap = (...args: any[]) => {
    const lines = Array.from(args).map(x => {
      const f = (_: any, v: any) => v && v.buffer instanceof ArrayBuffer
        ? Array.from(v).toString() : v
      return JSON.stringify(x, f, 2).replace(/\\n/g, '<br/>')
    })
    const el = document.createElement('pre')
    el.innerHTML = lines.join(' ')
    logEL?.prepend(el)
    log(...args)
  }
  return logWrap
}

// Prevents default redirect for link <a href="#">
export const handleHashHref = (ev: Event) => {
  const target = ev.target as Element
  const isHrefHash = target
    && target.nodeName === 'A'
    && target.attributes.getNamedItem('href')?.value === '#'

  if (isHrefHash) ev.preventDefault()
}
