"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/Button"
import { Calendar } from "@/components/ui/Calendar"
import { Input } from "@/components/ui/Input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showTime?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "选择日期",
  className,
  disabled,
  showTime = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(value, "HH:mm:ss") : "00:00:00"
  )

  React.useEffect(() => {
    setSelectedDate(value)
    if (value) {
      setTimeValue(format(value, "HH:mm:ss"))
    }
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date && showTime) {
      const [hours, minutes, seconds] = timeValue.split(":").map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours || 0, minutes || 0, seconds || 0, 0)
      onChange?.(newDate)
    } else {
      onChange?.(date)
    }
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeValue(newTime)
    if (selectedDate) {
      const [hours, minutes, seconds] = newTime.split(":").map(Number)
      const newDate = new Date(selectedDate)
      newDate.setHours(hours || 0, minutes || 0, seconds || 0, 0)
      onChange?.(newDate)
    }
  }

  const formatDisplayDate = (date: Date): string => {
    if (showTime) {
      return format(date, "yyyy-MM-dd")
    }
    return format(date, "yyyy-MM-dd")
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {value ? formatDisplayDate(value) : placeholder}
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            captionLayout="dropdown"
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {showTime && (
        <Input
          type="time"
          step="1"
          value={timeValue}
          onChange={handleTimeChange}
          className="w-full bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          disabled={disabled}
        />
      )}
    </div>
  )
}
