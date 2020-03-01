import * as R from 'ramda'

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
