-- 既存のシフトデータの予約可能時間を新しいロジックで更新
-- 各時間枠の予約可能時間を開始時刻のみに設定

-- このSQLをSupabase Dashboard → SQL Editorで実行してください

DO $$
DECLARE
  shift_record RECORD;
  updated_slots JSONB;
  slot JSONB;
  new_slot JSONB;
BEGIN
  -- すべてのシフトを取得
  FOR shift_record IN SELECT id, time_slots FROM shift LOOP
    updated_slots := '[]'::jsonb;

    -- 各時間枠を処理
    FOR slot IN SELECT * FROM jsonb_array_elements(shift_record.time_slots) LOOP
      -- 予約可能時間を開始時刻のみに更新
      new_slot := jsonb_set(
        slot,
        '{available_times}',
        jsonb_build_array(slot->>'start_time')
      );

      updated_slots := updated_slots || jsonb_build_array(new_slot);
    END LOOP;

    -- シフトを更新
    UPDATE shift
    SET time_slots = updated_slots
    WHERE id = shift_record.id;

    RAISE NOTICE 'Updated shift ID: %', shift_record.id;
  END LOOP;

  RAISE NOTICE '✅ すべてのシフトの予約可能時間を更新しました';
END $$;
