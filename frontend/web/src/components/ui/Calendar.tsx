"use client"

import * as React from "react"
import { addMonths, format } from "date-fns"
import { type Locale, zhCN } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type CaptionProps } from "react-day-picker"

import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/Button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  weekStartsOn = 1,
  locale = zhCN,
  formatters,
  ...props
}: CalendarProps) {
  const localeForFns = locale as unknown as Locale

  const Caption = React.useCallback(
    (captionProps: CaptionProps | any) => {
      const { displayMonth, onMonthChange, fromMonth, toMonth } = captionProps
      const currentYear = displayMonth.getFullYear()

      const monthOptions = React.useMemo(
        () =>
          Array.from({ length: 12 }, (_, i) => ({
            value: i,
            label: format(new Date(currentYear, i, 1), "LLLL", {
              locale: localeForFns,
            }),
          })),
        [currentYear, localeForFns]
      )

      const yearRange = React.useMemo(() => {
        const start =
          fromMonth?.getFullYear() ??
          Math.max(1900, currentYear - 50)
        const end =
          toMonth?.getFullYear() ??
          Math.min(2100, currentYear + 50)
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
      }, [currentYear, fromMonth, toMonth])

      const handlePrev = React.useCallback(() => {
        onMonthChange?.(addMonths(displayMonth, -1))
      }, [displayMonth, onMonthChange])

      const handleNext = React.useCallback(() => {
        onMonthChange?.(addMonths(displayMonth, 1))
      }, [displayMonth, onMonthChange])

      const handleMonthChange = React.useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
          const newMonth = Number(event.target.value)
          const next = new Date(displayMonth)
          next.setMonth(newMonth)
          onMonthChange?.(next)
        },
        [displayMonth, onMonthChange]
      )

      const handleYearChange = React.useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
          const newYear = Number(event.target.value)
          const next = new Date(displayMonth)
          next.setFullYear(newYear)
          onMonthChange?.(next)
        },
        [displayMonth, onMonthChange]
      )

      return (
        <div className="flex items-center justify-between gap-3 px-2 pt-1 flex-nowrap">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="bg-muted text-foreground rounded-md px-3 py-2 text-sm font-medium border border-border"
              onChange={handleMonthChange}
              value={displayMonth.getMonth()}
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              className="bg-muted text-foreground rounded-md px-3 py-2 text-sm font-medium border border-border"
              onChange={handleYearChange}
              value={currentYear}
            >
              {yearRange.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )
    },
    [locale]
  )

  const mergedFormatters = React.useMemo(
    () => ({
      formatCaption: (month: Date) =>
        format(month, "yyyy年 M月", { locale: localeForFns }),
      formatWeekdayName: (date: Date) =>
        format(date, "EEE", { locale: localeForFns }),
      ...formatters,
    }),
    [formatters, localeForFns]
  )

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={weekStartsOn}
      // 类型与 date-fns Locale 不完全对齐，这里强制断言
      locale={locale as any}
      formatters={mergedFormatters}
      hideNavigation
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "px-0 pt-0",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn("h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_selected:
          "bg-muted text-foreground rounded-md shadow-sm border border-border hover:bg-muted focus:bg-muted",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      // 自定义 Caption 让导航与年月下拉同排
      // @ts-ignore: 自定义 Caption 未在类型声明中暴露但运行时支持
      components={{ Caption }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

