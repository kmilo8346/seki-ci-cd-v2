-- Table: public.commit_tasks

-- DROP TABLE IF EXISTS public.commit_tasks CASCADE;

CREATE TABLE IF NOT EXISTS public.commit_tasks
(
    commit_id   VARCHAR(32) NOT NULL,
    task_id     INTEGER NOT NULL,
    state       text NOT NULL DEFAULT 'IDLE'::text,
    status      text NOT NULL DEFAULT 'UNDETERMINED'::text,
    step        CHAR(2) NOT NULL,
    sub_step    VARCHAR(50) NOT NULL,
    depends_on  CHAR(2) NOT NULL,
    kind        VARCHAR(50) NOT NULL,
    command     VARCHAR(255) NOT NULL,
    markdown    TEXT,
    meta_data   JSONB NOT NULL default '{}'::jsonb,
    updated_at  timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    started_at  timestamp(6) with time zone DEFAULT NULL,
    created_at  timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    
    CONSTRAINT commit_tasks_pkey PRIMARY KEY (commit_id, task_id),
    CONSTRAINT commit_tasks_task_id_unique UNIQUE (commit_id, task_id),
    CONSTRAINT commit_tasks_commit_id_foreign FOREIGN KEY (commit_id)
        REFERENCES public.commits (id) MATCH SIMPLE
        ON DELETE CASCADE,
    CONSTRAINT commit_tasks_state_check CHECK (state = ANY (ARRAY['IDLE'::text, 'PENDING'::text, 'STARTED'::text, 'COMPLETED'::text])),
    CONSTRAINT commit_tasks_status_check CHECK (status = ANY (ARRAY['UNDETERMINED'::text, 'ERROR'::text, 'WARN'::text, 'SUCCESS'::text]))
)

TABLESPACE pg_default;

COMMENT ON COLUMN public.commit_tasks.commit_id
    IS 'Commits table reference';

COMMENT ON COLUMN public.commit_tasks.task_id
    IS 'ordinal of the task';

-- Index: commit_tasks_state_index

-- DROP INDEX IF EXISTS public.commit_tasks_state_index;

CREATE INDEX IF NOT EXISTS commit_tasks_state_index
    ON public.commit_tasks USING btree
    (state ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: commit_tasks_task_id_index

-- DROP INDEX IF EXISTS public.commit_tasks_task_id_index;

CREATE INDEX IF NOT EXISTS commit_tasks_task_id_index
    ON public.commit_tasks USING btree
    (task_id ASC NULLS LAST)
    TABLESPACE pg_default;