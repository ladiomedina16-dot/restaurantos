'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Delete, CornerDownLeft } from 'lucide-react'

/**
 * POS Touch Calculator — frontend-only, no backend interaction.
 * Provides basic arithmetic operations optimized for 15"-22" touch screens.
 */
export function Calculator() {
  const [display, setDisplay] = useState('0')
  const [prevValue, setPrevValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [justCalculated, setJustCalculated] = useState(false)

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else if (justCalculated) {
      setDisplay(digit)
      setJustCalculated(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand || justCalculated) {
      setDisplay('0.')
      setWaitingForOperand(false)
      setJustCalculated(false)
      return
    }
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const clear = () => {
    setDisplay('0')
    setPrevValue(null)
    setOperator(null)
    setWaitingForOperand(false)
    setJustCalculated(false)
  }

  const backspace = () => {
    if (waitingForOperand || justCalculated) return
    if (display.length > 1) {
      setDisplay(display.slice(0, -1))
    } else {
      setDisplay('0')
    }
  }

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display)

    if (prevValue === null) {
      setPrevValue(inputValue)
    } else if (operator) {
      const currentValue = prevValue
      let result: number

      switch (operator) {
        case '+': result = currentValue + inputValue; break
        case '-': result = currentValue - inputValue; break
        case '×': result = currentValue * inputValue; break
        case '÷': result = inputValue !== 0 ? currentValue / inputValue : 0; break
        default: result = inputValue
      }

      const rounded = Math.round(result * 100) / 100
      setPrevValue(rounded)
      setDisplay(String(rounded))
    }

    setWaitingForOperand(true)
    setOperator(nextOperator)
    setJustCalculated(false)
  }

  const handleEquals = () => {
    if (operator === null || prevValue === null) return

    const inputValue = parseFloat(display)
    let result: number

    switch (operator) {
      case '+': result = prevValue + inputValue; break
      case '-': result = prevValue - inputValue; break
      case '×': result = prevValue * inputValue; break
      case '÷': result = inputValue !== 0 ? prevValue / inputValue : 0; break
      default: result = inputValue
    }

    const rounded = Math.round(result * 100) / 100
    setDisplay(String(rounded))
    setPrevValue(null)
    setOperator(null)
    setWaitingForOperand(false)
    setJustCalculated(true)
  }

  const calcButtons = [
    { label: 'C', action: clear, className: 'bg-red-900/40 hover:bg-red-900/60 text-red-200' },
    { label: '⌫', action: backspace, className: 'bg-slate-700/60 hover:bg-slate-600/60 text-slate-200', icon: <Delete className="size-5" /> },
    { label: '÷', action: () => performOperation('÷'), className: `bg-amber-700/40 hover:bg-amber-700/60 text-amber-200 ${operator === '÷' && waitingForOperand ? 'ring-2 ring-amber-400' : ''}` },
    { label: '7', action: () => inputDigit('7'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '8', action: () => inputDigit('8'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '9', action: () => inputDigit('9'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '×', action: () => performOperation('×'), className: `bg-amber-700/40 hover:bg-amber-700/60 text-amber-200 ${operator === '×' && waitingForOperand ? 'ring-2 ring-amber-400' : ''}` },
    { label: '4', action: () => inputDigit('4'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '5', action: () => inputDigit('5'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '6', action: () => inputDigit('6'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '-', action: () => performOperation('-'), className: `bg-amber-700/40 hover:bg-amber-700/60 text-amber-200 ${operator === '-' && waitingForOperand ? 'ring-2 ring-amber-400' : ''}` },
    { label: '1', action: () => inputDigit('1'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '2', action: () => inputDigit('2'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '3', action: () => inputDigit('3'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '+', action: () => performOperation('+'), className: `bg-amber-700/40 hover:bg-amber-700/60 text-amber-200 ${operator === '+' && waitingForOperand ? 'ring-2 ring-amber-400' : ''}` },
    { label: '0', action: () => inputDigit('0'), className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white col-span-2' },
    { label: '.', action: inputDecimal, className: 'bg-slate-800/60 hover:bg-slate-700/60 text-white' },
    { label: '=', action: handleEquals, className: 'bg-emerald-700/50 hover:bg-emerald-700/70 text-emerald-100', icon: <CornerDownLeft className="size-4" /> },
  ]

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 p-3 shadow-lg">
      {/* Display */}
      <div className="bg-slate-950 rounded-lg px-4 py-3 mb-3 border border-slate-700/30">
        <div className="flex items-center justify-between">
          {operator && prevValue !== null && (
            <span className="text-slate-500 text-sm mr-2">
              {prevValue} {operator}
            </span>
          )}
          <span className="text-2xl font-mono font-bold text-emerald-400 ml-auto tracking-tight">
            {display}
          </span>
        </div>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {calcButtons.map((btn, i) => (
          <Button
            key={i}
            variant="ghost"
            className={`h-12 text-lg font-semibold rounded-lg transition-all active:scale-95 ${btn.className}`}
            onClick={btn.action}
          >
            {btn.icon ?? btn.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
