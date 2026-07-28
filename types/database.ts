export type Brand = 'most_eyes' | 'ssin_studio' | 'lumiss'

export interface Trainee {
  id: string
  name: string
  brand: Brand | null
  is_active: boolean
  created_at: string
}

export interface Menu {
  id: string
  name: string
  duration_minutes: number
  color: string
  is_active: boolean
  created_at: string
}

export interface TimeSlot {
  start_time: string
  end_time: string
  menu_ids: string[]
  available_times: string[]
  blocked_times?: string[]
}

export interface Shift {
  id: string
  trainee_id: string
  date: string
  time_slots: TimeSlot[]
  break_start: string | null
  break_end: string | null
  created_at: string
}

export interface Reservation {
  id: string
  reservation_number: string | null
  trainee_id: string
  menu_id: string
  date: string
  start_time: string
  end_time: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  status: 'confirmed' | 'cancelled'
  created_at: string
  cancelled_at: string | null
}

export interface CancellationHistory {
  id: string
  reservation_id: string | null
  reservation_number: string | null
  trainee_id: string | null
  trainee_name: string
  menu_name: string
  date: string
  start_time: string
  end_time: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  cancelled_by: 'salon' | 'customer'
  cancelled_at: string
  cancellation_reason: string | null
  original_created_at: string | null
}
