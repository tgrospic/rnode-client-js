import * as R from 'ramda'
import m from 'mithril'

// Common styles

const labelBaseStyle = { 'font-size': '.8rem', padding: '2px 0 0 0', transition: 'all 1s' }

const styleShowHide  = isVis => ({ opacity: isVis ? .65 : 0, height: isVis ? 'auto' : 0 })

export const labelStyle = isVis => ({ style: {...labelBaseStyle, ...styleShowHide(isVis) } })

export const showRevDecimal = amount => {
  const d = 8 // decimal places
  const amountNr   = parseInt(amount)
  const amountStr  = isNaN(amountNr) ? '' : `${amountNr}`
  const length     = amountStr.length
  const trimZeroes = s => s.replace(/[\.]?[0]*$/ig, '')
  if (length === 0) return ''
  if (length <= d) {
    const padded = amountStr.padStart(d, '0')
    return trimZeroes(`0.${padded}`)
  } else if (length > d) {
    const prefix = amountStr.slice(0, -d)
    const suffix = amountStr.slice(-d)
    return trimZeroes(`${prefix}.${suffix}`)
  }
}

export const labelRev = amount =>
  amount && m('span.rev', amount, m('b', ' REV'))

export const showNetworkError = errMessage =>
  errMessage == 'Failed to fetch'
    ? `${errMessage}: select a running RNode from the above selector.`
    : errMessage

// State cell
export const mkCell = () => {
  let _stRef, _listener
  const ln = path =>
    R.is(Function, path) ? path : R.lensPath(path.split('.').filter(p => !R.isEmpty(p)))
  const stCell = path => {
    const lens = ln(path)
    return {
      view: def => {
        const res = R.view(lens, _stRef)
        return R.isNil(res) ? def : res
      },
      set: v => {
        _stRef = R.set(lens, v, _stRef)
        // Trigger event (render)
        _listener(_stRef)
      },
      update: f => {
        const s = R.view(lens, _stRef)
        _stRef = R.set(lens, f(s), _stRef)
        // Trigger event (render)
        _listener(_stRef)
      },
      // Compose lenses / make sub cells
      o: compPath => {
        const subLens = R.compose(lens, ln(compPath))
        return stCell(subLens)
      },
    }
  }
  return {
    ...stCell(''),
    // Set event (on-change) listener
    setListener: f => { _listener = f },
  }
}

// Converts RhoExpr response from RNode WebAPI
// https://github.com/rchain/rchain/blob/b7331ae05/node/src/main/scala/coop/rchain/node/api/WebApi.scala#L128-L147
// - return!("One argument")   // monadic
// - return!((true, A, B))     // monadic as tuple
// - return!(true, A, B)       // polyadic
// new return(`rho:rchain:deployId`) in {
//   return!((true, "Hello from blockchain!"))
// }
// TODO: make it stack safe
export const rhoExprToJS = input => {
  const loop = rhoExpr => convert(rhoExpr)(converters)
  const converters = R.toPairs(converterMapping(loop))
  return loop(input)
}

const convert = rhoExpr => R.pipe(
  R.map(matchTypeConverter(rhoExpr)),
  R.find(x => !R.isNil(x)),
  // Return the whole object if unknown type
  x => R.isNil(x) ? [R.identity, rhoExpr] : x,
  ([f, d]) => f(d)
)

const matchTypeConverter = rhoExpr => ([type, f]) => {
  const d = R.path([type, 'data'], rhoExpr)
  return R.isNil(d) ? void 666 : [f, d]
}

const converterMapping = loop => ({
  "ExprInt": R.identity,
  "ExprBool": R.identity,
  "ExprString": R.identity,
  "ExprBytes": R.identity,
  "ExprUri": R.identity,
  "UnforgDeploy": R.identity,
  "UnforgDeployer": R.identity,
  "UnforgPrivate": R.identity,
  "ExprUnforg": loop,
  "ExprPar": R.map(loop),
  "ExprTuple": R.map(loop),
  "ExprList": R.map(loop),
  "ExprMap": R.mapObjIndexed(loop),
})
