-- PROCEDURE: public.pa_complete_task(character varying, integer, character varying, text, jsonb)

-- DROP PROCEDURE IF EXISTS public.pa_complete_task(character varying, integer, character varying, text, jsonb);

CREATE OR REPLACE PROCEDURE public.pa_complete_task(
	IN _commit_id character varying,
	IN _task_id integer,
	IN _status character varying,
	IN _markdown text,
	IN _meta_data jsonb)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
	task_item 				  		record;
	TASK_STEP 						commit_tasks.step%type;
	TASKS_BY_STEP_COUNT 			int := 0;
	TASKS_BY_STEP_STATE 			commit_tasks.state%type;
	TOTAL_ERRORS       				int := 0;
BEGIN
	--[ FIRST: Update the state of that task to 'COMPLETE'
	UPDATE 	commit_tasks
	SET		state		=	'COMPLETED',
			updated_at	=	CURRENT_TIMESTAMP(6),
			status		=	_status,
			markdown	=	_markdown,
			meta_data	=	_meta_data
	WHERE	commit_id	=	_commit_id AND
			task_id 	= 	_task_id;
	--------------------------------------------------------
	
	--[ SECOND: Create a temporal table to analize all task in the commit to decide the next PENDINGS tasks
	--		  	if all other tasks are completed
	CREATE TEMPORARY TABLE tasks_from_commit (
		task_id		INTEGER,
		step		CHAR(2),
    	state 		TEXT,
		status 		TEXT
	) ON COMMIT DROP;
	--------------------------------------------------------
	
	--[ THRID: Insert data into a temporary table to analyze the tasks in the commits
	INSERT INTO tasks_from_commit
	SELECT 		
		task_id, 
		step, 
		state,
		status
	FROM	commit_tasks	tasks
	WHERE	tasks.commit_id = _commit_id;
	--------------------------------------------------------
		
	--[ FOURTH: Get the step of the updated task in the commit (which could be "VA","GD","CI","BS", etc)
	SELECT 	step INTO TASK_STEP 
	FROM 	tasks_from_commit 
	WHERE 	task_id = _task_id;
	--------------------------------------------------------
	
	--[ FIFTH: 	Here we can have 2 situtations ^^:
	--			OPTION 1: 	Can be only 1 row affected by the next query , that 
	--						means that we have all task in just one state (all PENDINGS, or COMPLETED, or IDLE OR STARTED)
	--						if the state is "COMPLETED", means all tasks of the task_step are COMPLETED and that is really GOOD =)!
	--
	--			OPTION 2:	The query has more than 1 row returned and means that the tasks 
	--						in that step are not in the same state and for that reason we dont do anything, because we need to 
	--						mark PENDING all the "next" step only if all tasks in the current PENDING task_step are COMPLETED
	FOR task_item IN 
		SELECT 		state, COUNT(*) as total
		FROM 		tasks_from_commit tasks
		WHERE 		tasks.step = TASK_STEP
		GROUP BY 	tasks.state 
	LOOP
		TASKS_BY_STEP_COUNT := TASKS_BY_STEP_COUNT + 1;
		TASKS_BY_STEP_STATE := task_item.state;
	END LOOP;
	
	--[ SIXTH: 	If we have 1 row and the state of that grouped state is 'COMPLETED'
	--			then we need to mark 'PENDING' all tasks that depends of the current step updated
	IF (TASKS_BY_STEP_COUNT = 1 and TASKS_BY_STEP_STATE = 'COMPLETED') THEN
	
		-- RAISE NOTICE 'Update all next steps depends on this step %', TASK_STEP;

		-- We need the ALL of metadata created from the past steps for the future 'NON-STARTED YET' steps
		-- and for that reason , we need to 'plunk' all data into one row in the commit
		UPDATE 	commits
		SET		meta_data = (
					-- Collapse all meta_data from steps into just one array for fast retrieve
					WITH step_metadata as (
						SELECT 
							step, 
							sub_step,
							kind,
							command,
							meta_data
						FROM 
							commit_tasks
						WHERE
							state 		= 'COMPLETED' AND
							commit_id 	= _commit_id
						ORDER BY
							task_id	ASC
					) SELECT JSON_AGG(step_metadata.*) as meta_data
					FROM step_metadata
					-----------------
				)
		WHERE 	id = _commit_id;
	
	    --[ I know that the step is complete but i dont know if there are any errors
		--  Below i count the errors
		SELECT COUNT(*)
		INTO  TOTAL_ERRORS
		FROM  tasks_from_commit tasks
		WHERE tasks.status = 'ERROR';
		
		-- raise log'TOTAL_ERRORS %',TOTAL_ERRORS;
		
		--[ If not errors i can continue with the logic
		IF (TOTAL_ERRORS = 0) THEN	
			-- "Activates" all the step that were dependants of the current TASK_STEP and mark as "PENDING"
			-- in order for the jobs can take it and 'STARTED'
			UPDATE 	commit_tasks
			SET		state		=	'PENDING',
					updated_at	=	CURRENT_TIMESTAMP(6)
			WHERE	commit_id 	= 	_commit_id AND
					depends_on	=	TASK_STEP;
					
					
			-- If row affected are equals to 0, means that pipeline has concluded!
			-- update the pipeline to 'COMPLETED'
			IF NOT EXISTS (SELECT FROM tasks_from_commit WHERE state != 'COMPLETED') THEN
				-- RAISE NOTICE 'Mark pipeline % has completed', _commit_id;	
				UPDATE 	commits
				SET		state		=	'COMPLETED',
						updated_at	=	CURRENT_TIMESTAMP(6)
				WHERE	id		 	= 	_commit_id;
			END IF;
					
		ELSE
			-- If there are any errors i mark the the pipeline as completed immediatly
        	UPDATE 	commits
				SET		state		=	'COMPLETED',
						updated_at	=	CURRENT_TIMESTAMP(6)
				WHERE	id		 	= 	_commit_id;
    		END IF;							
		
		
	END IF;
	--------------------------------------------------------
	
	
	--- DEBUGGING !!
	/*

	RAISE NOTICE 'Task step: %', TASK_STEP;
	RAISE NOTICE 'Task grouped count %', TASKS_BY_STEP_COUNT;
	RAISE NOTICE 'Task grouped state %', TASKS_BY_STEP_STATE;
	
	FOR task_item IN SELECT * FROM tasks_from_commit LOOP
		RAISE NOTICE 'item %', to_json(task_item);
	END LOOP;

	*/
	
	COMMIT;
END;
$BODY$;

