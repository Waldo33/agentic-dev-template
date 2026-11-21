-- Счётчик визитов главной — пример, что база подключена и миграции работают.
create table if not exists counters (
  name text primary key,
  value bigint not null default 0
);
