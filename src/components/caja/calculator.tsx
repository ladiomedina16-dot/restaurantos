'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Delete, CornerDownLeft } from 'lucide-react'

/**
 * Compact POS Touch Calculator — frontend-only, no backend interaction.
 * Light-themed to match the POS redesign.
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
    { label: 'C', action: clear, cls: 'bg-red-100 hover:bg-red-200 text-red-700' },
    { label: '⌫', action: backspace, cls: 'bg-gray-100 hover:bg-gray-200 text-gray-700', icon: <Delete className="size-3.5" /> },
    { label: '÷', action: () => performOperation('÷'), cls: `bg-amber-100 hover:bg-amber-200 text-amber-700 ${operator === '÷' && waitingForOperand ? 'ring-2 ring-amber-400' : ''}` },
    { label: '7', action: () => inputDigit('7'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '8', action: () => inputDigit('8'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '9', action: () => inputDigit('9'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '×', action: () => performOperation('×'), cls: `bg-amber-100 hover:bg-amber-200 text-amber-700 ${operator === '×' && waitingForOperand ? 'ring-2 ring-amber-400' : ''}` },
    { label: '4', action: () => inputDigit('4'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '5', action: () => inputDigit('5'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '6', action: () => inputDigit('6'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '-', action: () => performOperation('-'), cls: `bg-amber-100 hover:bg-amber-200 text-amber-700 ${operator === '-' && waitingForOperand ? 'ring-2 ring-amber-400' : ''}` },
    { label: '1', action: () => inputDigit('1'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '2', action: () => inputDigit('2'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '3', action: () => inputDigit('3'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '+', action: () => performOperation('+'), cls: `bg-amber-100 hover:bg-amber-200 text-amber-700 ${operator === '+' && waitingForOperand ? 'ring-2 ring-amber-400' : ''}` },
    { label: '0', action: () => inputDigit('0'), cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 col-span-2' },
    { label: '.', action: inputDecimal, cls: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200' },
    { label: '=', action: handleEquals, cls: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700', icon: <CornerDownLeft className="size-3.5" /> },
  ]

  return (
    <div className="bg-white rounded-lg p-3 shrink-0">
      {/* Display */}
      <div className="bg-gray-50 rounded px-3 py-2 mb-3 border border-gray-200 flex items-center justify-between min-h-[40px]">
        {operator && prevValue !== null && (
          <span className="text-gray-400 text-xs mr-2">{prevValue} {operator}</span>
        )}
        <span className="text-xl font-mono font-bold text-emerald-600 ml-auto tracking-tight">
          {display}
        </span>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {calcButtons.map((btn, i) => (
          <Button
            key={i}
            variant="ghost"
            className={`h-10 text-sm font-semibold rounded-lg transition-all active:scale-95 ${btn.cls}`}
            onClick={btn.action}
          >
            {btn.icon ?? btn.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
