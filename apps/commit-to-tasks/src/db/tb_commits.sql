-- Table: public.commits

-- DROP TABLE IF EXISTS public.commits CASCADE;

CREATE TABLE IF NOT EXISTS commits
(
    id              VARCHAR(32) NOT NULL,                 
    commit          VARCHAR(40) NOT NULL,   
    commit_message  VARCHAR(255) NOT NULL,   
    reference       VARCHAR(40) NOT NULL,   
    environment     text NOT NULL,          
    state           text NOT NULL DEFAULT 'IDLE'::text,
    organization    VARCHAR(40) NOT NULL,
    repository      VARCHAR(40) NOT NULL,
    trigger         text NOT NULL,          
    trigger_by      VARCHAR(255) NOT NULL, 
    meta_data       JSONB NOT NULL default '[]'::jsonb,
    created_at      timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    CONSTRAINT commits_pkey PRIMARY KEY (id),
    CONSTRAINT commits_commit_reference_unique UNIQUE (commit,reference),
    CONSTRAINT commits_environment_check CHECK (environment = ANY (ARRAY['staging'::text, 'production'::text])),
    CONSTRAINT commits_trigger_check CHECK (trigger = ANY (ARRAY['commit'::text, 'tag'::text])),
    CONSTRAINT commits_state_check CHECK (state = ANY (ARRAY['IDLE'::text, 'STARTED'::text, 'COMPLETED'::text]))
)

TABLESPACE pg_default;

COMMENT ON COLUMN public.commits.id
    IS 'format: md5(commit + | + reference)';

COMMENT ON COLUMN public.commits.commit
    IS 'Commit id from git';

COMMENT ON COLUMN public.commits.reference
    IS 'Reference from git, can be the commit (-) or a tag';

COMMENT ON COLUMN public.commits.environment
    IS 'Environment to process, if ref is commit: staging otherwise production';

COMMENT ON COLUMN public.commits.trigger
    IS 'Trigger can be commit or tag according to the reference';

COMMENT ON COLUMN public.commits.trigger_by
    IS 'format: {name}<{email}>';

COMMENT ON COLUMN public.commits.meta_data
    IS 'contains all meta_data from the steps and its constantly updated when all tasks in a step are "COMPLETED"';

    
-- Index: commits_organization_index

-- DROP INDEX IF EXISTS public.commits_organization_index;

CREATE INDEX IF NOT EXISTS commits_id_index
    ON public.commits USING btree
    (id ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS commits_organization_index
    ON public.commits USING btree
    (organization ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS commits_commit_reference_index
    ON public.commits USING btree
    (commit ASC NULLS LAST, reference ASC NULLS LAST)
    TABLESPACE pg_default;