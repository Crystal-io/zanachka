import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Download, ShieldCheck, Tags, TriangleAlert, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useConfirm, useToast } from '../components/Feedback';
import { Section } from '../components/ui';
import { db } from '../db';
import { useMeta } from '../hooks';
import { downloadBackup, readBackup, restoreBackup } from '../lib/backup';
import { daysSince } from '../lib/dates';
import { plural } from '../lib/format';

const APP_VERSION = '0.1.0';

function ago(timestamp: number): string {
  const days = daysSince(timestamp);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
}

export default function Settings() {
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const lastBackupAt = useMeta<number>('lastBackupAt');
  const counts = useLiveQuery(async () => ({ accounts: await db.accounts.count(), txs: await db.transactions.count() }), []);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(false));
  }, []);

  const save = async () => {
    await downloadBackup();
    toast({ message: 'Копия сохранена в «Загрузки»' });
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const backup = await readBackup(file);
      const ok = await confirm({
        title: 'Восстановить из копии?',
        message: `Копия от ${new Date(backup.exportedAt).toLocaleDateString('ru-RU')}: ${backup.accounts.length} ${plural(backup.accounts.length, ['счёт', 'счёта', 'счетов'])}, ${backup.transactions.length} ${plural(backup.transactions.length, ['операция', 'операции', 'операций'])}. Текущие данные на телефоне будут заменены.`,
        confirmLabel: 'Заменить данные',
        danger: true,
      });
      if (!ok) return;
      await restoreBackup(backup);
      toast({ message: 'Данные восстановлены' });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Не удалось прочитать файл' });
    }
  };

  return (
    <>
      <h1 className="page-title">Ещё</h1>

      <Section title="Настройка">
        <div className="list">
          <Link to="/settings/categories" className="row">
            <Tags size={20} strokeWidth={1.75} />
            <span className="row__label">Категории</span>
            <ChevronRight size={18} className="row__chev" />
          </Link>
        </div>
      </Section>

      <Section title="Резервная копия">
        <p className="muted">{lastBackupAt ? `Последняя копия — ${ago(lastBackupAt)}` : 'Копий ещё не было'}</p>
        <p className="field__hint">
          Все данные хранятся только в этом телефоне. Раз в неделю сохраняйте копию и переносите файл в Google Диск — так
          данные переживут потерю телефона.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={save}>
            <Download size={18} />
            Сохранить копию
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={18} />
            Восстановить
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
      </Section>

      <Section title="Хранилище">
        <div className="list">
          <div className="row">
            {persisted ? <ShieldCheck size={20} strokeWidth={1.75} /> : <TriangleAlert size={20} strokeWidth={1.75} />}
            <span className="row__label">
              {persisted
                ? 'Браузер не удалит данные сам'
                : 'Браузер может удалить данные при нехватке места — установите приложение на главный экран'}
            </span>
          </div>
          {counts && (
            <div className="row">
              <span className="row__label muted">
                {counts.accounts} {plural(counts.accounts, ['счёт', 'счёта', 'счетов'])} · {counts.txs}{' '}
                {plural(counts.txs, ['операция', 'операции', 'операций'])}
              </span>
            </div>
          )}
        </div>
      </Section>

      <p className="version">Заначка · версия {APP_VERSION}</p>
    </>
  );
}
