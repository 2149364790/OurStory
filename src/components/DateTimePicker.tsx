import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  type: 'date' | 'datetime';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  placement?: 'top' | 'bottom';
  align?: 'left' | 'right' | 'center';
}

// Helper to get days for Monday-first calendar grid (42 cells)
const getDaysInMonth = (year: number, month: number) => {
  // getDay() is 0 for Sunday, 1 for Monday, etc.
  // We want Monday to be 0, Tuesday to be 1, ..., Sunday to be 6.
  let firstDayIndex = new Date(year, month, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevMonthTotalDays - i,
      isCurrentMonth: false,
      monthOffset: -1,
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      monthOffset: 0,
    });
  }

  // Next month padding days to make exactly 42 cells (6 rows)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      monthOffset: 1,
    });
  }

  return days;
};

const yearsList: number[] = [];
const currentYearNum = new Date().getFullYear();
for (let y = currentYearNum + 2; y >= 2000; y--) {
  yearsList.push(y);
}

const monthsList = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  type,
  placeholder = '选择时间',
  disabled = false,
  className = '',
  clearable = true,
  placement = 'bottom',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  // Parsed internal states
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // Selected date/time state
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // 0-11
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  // Sync internal states with external value
  useEffect(() => {
    if (value) {
      try {
        const parts = value.split('T');
        const dateParts = parts[0].split('-');
        const y = parseInt(dateParts[0], 10);
        const m = parseInt(dateParts[1], 10) - 1; // 0-indexed
        const d = parseInt(dateParts[2], 10);

        setSelectedYear(y);
        setSelectedMonth(m);
        setSelectedDay(d);
        setViewYear(y);
        setViewMonth(m);

        if (type === 'datetime' && parts[1]) {
          const timeParts = parts[1].split(':');
          setSelectedHour(parseInt(timeParts[0], 10) || 0);
          setSelectedMinute(parseInt(timeParts[1], 10) || 0);
        } else {
          setSelectedHour(0);
          setSelectedMinute(0);
        }
      } catch (err) {
        console.error('Error parsing value in DateTimePicker:', err);
      }
    } else {
      setSelectedYear(null);
      setSelectedMonth(null);
      setSelectedDay(null);
      setSelectedHour(new Date().getHours());
      setSelectedMinute(new Date().getMinutes());
    }
  }, [value, type]);

  // Click outside to close handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-scroll hours and minutes list to selected values
  useEffect(() => {
    if (isOpen && type === 'datetime') {
      // Small timeout to allow element to render and scroll
      const scrollTimer = setTimeout(() => {
        if (hourScrollRef.current) {
          const activeHourEl = hourScrollRef.current.querySelector('[data-active="true"]');
          if (activeHourEl) {
            hourScrollRef.current.scrollTop = (activeHourEl as HTMLElement).offsetTop - 70;
          }
        }
        if (minuteScrollRef.current) {
          const activeMinEl = minuteScrollRef.current.querySelector('[data-active="true"]');
          if (activeMinEl) {
            minuteScrollRef.current.scrollTop = (activeMinEl as HTMLElement).offsetTop - 70;
          }
        }
      }, 50);
      return () => clearTimeout(scrollTimer);
    }
  }, [isOpen, selectedHour, selectedMinute, type]);

  // Handle Month change
  const changeMonth = (offset: number) => {
    let nextMonth = viewMonth + offset;
    let nextYear = viewYear;

    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }

    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  // Helper to build external value string and trigger onChange
  const triggerChange = (y: number, m: number, d: number, hr = selectedHour, min = selectedMinute) => {
    const monthStr = (m + 1).toString().padStart(2, '0');
    const dayStr = d.toString().padStart(2, '0');
    const dateStr = `${y}-${monthStr}-${dayStr}`;

    if (type === 'datetime') {
      const hrStr = hr.toString().padStart(2, '0');
      const minStr = min.toString().padStart(2, '0');
      onChange(`${dateStr}T${hrStr}:${minStr}`);
    } else {
      onChange(dateStr);
    }
  };

  // Handle Day selection
  const handleDaySelect = (dayInfo: { day: number; isCurrentMonth: boolean; monthOffset: number }) => {
    let targetYear = viewYear;
    let targetMonth = viewMonth + dayInfo.monthOffset;

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    setSelectedYear(targetYear);
    setSelectedMonth(targetMonth);
    setSelectedDay(dayInfo.day);

    if (type === 'date') {
      triggerChange(targetYear, targetMonth, dayInfo.day);
      setIsOpen(false);
    }
  };

  // Handle Confirm action (mainly for datetime)
  const handleConfirm = () => {
    if (selectedYear !== null && selectedMonth !== null && selectedDay !== null) {
      triggerChange(selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute);
    } else {
      // Default to today
      const now = new Date();
      triggerChange(now.getFullYear(), now.getMonth(), now.getDate(), selectedHour, selectedMinute);
    }
    setIsOpen(false);
  };

  // Shortcuts: Today / Now
  const handleToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setSelectedDay(now.getDate());
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());

    if (type === 'datetime') {
      const h = now.getHours();
      const min = now.getMinutes();
      setSelectedHour(h);
      setSelectedMinute(min);
      triggerChange(now.getFullYear(), now.getMonth(), now.getDate(), h, min);
    } else {
      triggerChange(now.getFullYear(), now.getMonth(), now.getDate());
    }
    setIsOpen(false);
  };

  // Shortcuts: Clear
  const handleClear = () => {
    onChange('');
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setIsOpen(false);
  };

  // Handle backdrop click on mobile to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Formatted display value for trigger input
  const getDisplayValue = () => {
    if (!value) return '';
    try {
      const parts = value.split('T');
      const dateFormatted = parts[0].replace(/-/g, '/');
      if (type === 'datetime' && parts[1]) {
        return `${dateFormatted} ${parts[1]}`;
      }
      return dateFormatted;
    } catch {
      return value;
    }
  };

  const daysGrid = getDaysInMonth(viewYear, viewMonth);
  const now = new Date();

  // Helper arrays for hours & minutes list
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button styled like input */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-xl text-xs border bg-white flex items-center justify-between font-bold cursor-pointer select-none transition-all duration-300 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-rose-50/20 border-rose-100/30 text-rose-300' : 'border-rose-100 text-rose-800 hover:border-rose-300 hover:shadow-xs'
        } ${isOpen ? 'ring-2 ring-rose-400 border-rose-300 shadow-sm' : ''}`}
      >
        <span className={getDisplayValue() ? 'text-rose-800' : 'text-rose-300/80 font-medium'}>
          {getDisplayValue() || placeholder}
        </span>
        <div className="flex items-center space-x-1.5 text-rose-400">
          {value && clearable && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 hover:text-rose-600 rounded-full hover:bg-rose-50 transition"
            >
              <X size={12} />
            </button>
          )}
          {type === 'datetime' ? <Clock size={13} /> : <Calendar size={13} />}
          <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Popover Dropdown Calendar */}
      {isOpen && (
        <div
          onClick={handleBackdropClick}
          className={`fixed inset-0 z-[2000] bg-transparent flex items-center justify-center p-4 md:absolute md:inset-auto md:bg-transparent md:backdrop-blur-none md:p-0 md:z-[1000] ${
            placement === 'top' ? 'md:bottom-full md:mb-1.5 md:top-auto md:mt-0' : 'md:top-full md:mt-1.5 md:bottom-auto md:mb-0'
          } ${
            align === 'left' ? 'md:left-0 md:right-auto' : align === 'right' ? 'md:right-0 md:left-auto' : 'md:left-1/2 md:-translate-x-1/2'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white/95 backdrop-blur-xl border border-rose-100 rounded-3xl p-5 shadow-2xl select-none flex flex-col md:flex-row gap-4 animate-slide-up ${
              type === 'datetime' ? 'w-[280px] md:w-[420px]' : 'w-[280px]'
            }`}
            style={{
              maxWidth: 'calc(100vw - 2rem)',
            }}
          >
          {/* Calendar main section */}
          <div className="flex-1">
            {/* Header: month and year navigation */}
            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition active:scale-95"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex space-x-1.5">
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                  className="text-[10px] font-extrabold text-rose-800 bg-white/70 border border-rose-100/50 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-rose-300 cursor-pointer shadow-2xs"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                  className="text-[10px] font-extrabold text-rose-800 bg-white/70 border border-rose-100/50 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-rose-300 cursor-pointer shadow-2xs"
                >
                  {monthsList.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition active:scale-95"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Calendar Week Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[9.5px] font-extrabold text-rose-400 mb-1.5">
              {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
                <div key={w} className="py-0.5">{w}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((item, idx) => {
                let targetYear = viewYear;
                let targetMonth = viewMonth + item.monthOffset;
                if (targetMonth < 0) {
                  targetMonth = 11;
                  targetYear -= 1;
                } else if (targetMonth > 11) {
                  targetMonth = 0;
                  targetYear += 1;
                }

                const isSelected =
                  selectedYear === targetYear &&
                  selectedMonth === targetMonth &&
                  selectedDay === item.day;

                const isToday =
                  now.getFullYear() === targetYear &&
                  now.getMonth() === targetMonth &&
                  now.getDate() === item.day;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDaySelect(item)}
                    className={`py-1 text-[10.5px] rounded-lg font-bold transition-all duration-200 active:scale-90 flex items-center justify-center aspect-square ${
                      isSelected
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black shadow-md shadow-rose-200/50 scale-105'
                        : isToday
                        ? 'border border-dashed border-rose-400 text-rose-800 bg-rose-50/20'
                        : item.isCurrentMonth
                        ? 'text-rose-950 hover:bg-rose-50 hover:text-rose-700 hover:scale-105'
                        : 'text-rose-300 opacity-50 hover:bg-rose-50/30'
                    }`}
                  >
                    {item.day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Picker Section (only in datetime mode) */}
          {type === 'datetime' && (
            <div className="flex h-[130px] md:h-[200px] border-t md:border-t-0 md:border-l border-rose-100 pt-3 md:pt-0 md:pl-4 space-x-2 shrink-0 justify-center">
              {/* Hours Column */}
              <div className="flex flex-col w-[50px] shrink-0">
                <span className="text-[9px] text-rose-400 font-extrabold text-center pb-1">时</span>
                <div
                  ref={hourScrollRef}
                  className="flex-1 overflow-y-auto scrollbar-thin flex flex-col space-y-0.5 rounded-lg pr-0.5 max-h-[100px] md:max-h-[170px]"
                >
                  {hours.map((h) => {
                    const isHourSelected = selectedHour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        data-active={isHourSelected}
                        onClick={() => setSelectedHour(h)}
                        className={`py-1 text-[10px] font-bold rounded-md transition ${
                          isHourSelected
                            ? 'bg-rose-500 text-white shadow-xs font-black'
                            : 'text-rose-800 hover:bg-rose-50'
                        }`}
                      >
                        {h.toString().padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="w-[1px] bg-rose-50 self-stretch my-2" />

              {/* Minutes Column */}
              <div className="flex flex-col w-[50px] shrink-0">
                <span className="text-[9px] text-rose-400 font-extrabold text-center pb-1">分</span>
                <div
                  ref={minuteScrollRef}
                  className="flex-1 overflow-y-auto scrollbar-thin flex flex-col space-y-0.5 rounded-lg pr-0.5 max-h-[100px] md:max-h-[170px]"
                >
                  {minutes.map((m) => {
                    const isMinSelected = selectedMinute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        data-active={isMinSelected}
                        onClick={() => setSelectedMinute(m)}
                        className={`py-1 text-[10px] font-bold rounded-md transition ${
                          isMinSelected
                            ? 'bg-rose-500 text-white shadow-xs font-black'
                            : 'text-rose-800 hover:bg-rose-50'
                        }`}
                      >
                        {m.toString().padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Shortcuts & Confirm Button */}
          <div className="w-full flex justify-between items-center border-t border-rose-100/60 pt-3 md:col-span-2 gap-2 mt-auto">
            <div className="flex space-x-1.5">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 text-[9.5px] font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition active:scale-95"
              >
                {type === 'datetime' ? '现在' : '今天'}
              </button>
              {clearable && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 text-[9.5px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 rounded-lg transition active:scale-95"
                >
                  清除
                </button>
              )}
            </div>

            {type === 'datetime' && (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-3.5 py-1 text-[9.5px] font-black text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm shadow-rose-200/50 transition active:scale-95"
              >
                确定
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
