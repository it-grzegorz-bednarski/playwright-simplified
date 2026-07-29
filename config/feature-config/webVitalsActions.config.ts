import { requireTarget } from '@utils/webVitals/webVitalsHelpers';
import type { WebVitalsInteractionAction } from '@utils/webVitals/webVitalsTypes';
import { AddRemoveElementsPage } from '@pom/theInternet/pages/addRemoveElements.page';
import { CheckboxesPage } from '@pom/theInternet/pages/checkboxes.page';

export const webVitalsActions: Record<string, WebVitalsInteractionAction> = {
  flipBothCheckboxes: async ({ target }) => {
    await requireTarget(target, CheckboxesPage, 'flipBothCheckboxes').flipBothCheckboxes();
  },

  addAndRemoveElement: async ({ target }) => {
    await requireTarget(
      target,
      AddRemoveElementsPage,
      'addAndRemoveElement'
    ).addAndRemoveSingleElement();
  },
};
