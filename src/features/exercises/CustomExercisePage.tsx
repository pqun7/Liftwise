import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { PageIntro } from '../../components/PageIntro';
import { createCustomExercise } from './exerciseService';

interface CustomExerciseForm {
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string;
  equipment: string;
  notes: string;
}

export function CustomExercisePage() {
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomExerciseForm>({
    defaultValues: { name: '', primaryMuscle: '', secondaryMuscles: '', equipment: '', notes: '' },
  });

  const submit = handleSubmit(async (values) => {
    setSaveError(null);
    try {
      const exercise = await createCustomExercise({
        name: values.name,
        primaryMuscle: values.primaryMuscle.trim().toLocaleLowerCase('en').replaceAll(' ', '_'),
        secondaryMuscles: values.secondaryMuscles
          .split(',')
          .map((value) => value.trim().toLocaleLowerCase('en').replaceAll(' ', '_'))
          .filter(Boolean),
        equipment: values.equipment.trim()
          ? values.equipment.trim().toLocaleLowerCase('en').replaceAll(' ', '_')
          : null,
        notes: values.notes.trim() || null,
      });
      await navigate(`/exercises/${encodeURIComponent(exercise.id)}`);
    } catch {
      setSaveError('The exercise could not be saved. Your existing data is unchanged.');
    }
  });

  return (
    <section className="page-stack" aria-labelledby="custom-exercise-title">
      <Link className="back-link" to="/exercises">
        ← Exercise library
      </Link>
      <PageIntro
        titleId="custom-exercise-title"
        eyebrow="Custom exercise"
        title="Add your own movement"
        description="Custom exercises stay on this device and work alongside the built-in catalog."
      />
      <form className="exercise-form" onSubmit={(event) => void submit(event)} noValidate>
        <label>
          <span>Name</span>
          <input
            {...register('name', { required: 'Enter an exercise name.' })}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <small role="alert">{errors.name.message}</small> : null}
        </label>
        <label>
          <span>Primary muscle</span>
          <input
            {...register('primaryMuscle', { required: 'Enter a primary muscle.' })}
            placeholder="e.g. Chest"
            aria-invalid={Boolean(errors.primaryMuscle)}
          />
          {errors.primaryMuscle ? <small role="alert">{errors.primaryMuscle.message}</small> : null}
        </label>
        <label>
          <span>Secondary muscles</span>
          <input {...register('secondaryMuscles')} placeholder="Comma separated" />
        </label>
        <label>
          <span>Equipment</span>
          <input {...register('equipment')} placeholder="Leave blank for bodyweight" />
        </label>
        <label>
          <span>Notes</span>
          <textarea {...register('notes')} rows={4} />
        </label>
        {saveError ? (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        ) : null}
        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save custom exercise'}
        </button>
      </form>
    </section>
  );
}
