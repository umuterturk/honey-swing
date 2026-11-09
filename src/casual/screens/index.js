import {renderFactorInfo} from './factorInfo.jsx';
import {renderFeatureIntro} from './featureIntro.jsx';
import {renderLevelStart} from './levelStart.jsx';
import {renderLevelEnd} from './levelEnd.jsx';

// A new overlay is one module, its CSS, and one line here.
export const screens=[
  renderFactorInfo,
  renderFeatureIntro,
  renderLevelStart,
  renderLevelEnd
];
