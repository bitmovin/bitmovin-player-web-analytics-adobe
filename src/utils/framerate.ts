export type FramerateProjection = (manifest?: string) => number | undefined;
type FramerateObj = {
  framerate?: number;
};

/**
 * Takes a string and checks if "FRAME-RATE" exists (for HLS manifests).
 * @param s
 */
const includesFramerate = (s: string) => s.indexOf('FRAME-RATE') >= 0; // IE11 doesn't implement String.prototype.includes
/**
 * Takes a DOM node and checks if its nodeName is 'frameRate' (for MPEG-Dash manifests).
 * @param attr
 */
const framerateNodeName = (attr: Node): boolean =>
  attr.nodeName === 'frameRate';

/**
 * Computes the framerate from the shape of an MPEG-Dash framerate value (F or F/D).
 * D is assumed to be 1 if not part of the value.
 * @param s
 */
const fromFramerateAttr = (s: string) => {
  const [f, d = 1] = s.split('/');
  return +f / +d;
};

/**
 * Parses an HLS manifest line for framerate values.
 * @param line Line from HLS manifest
 * @returns an Object with a framerate property.
 */
const toFramerateFromString = (line: string) => {
  const framerateAttr = line.split(',').find(includesFramerate);
  const framerate = parseFloat(
    framerateAttr.substr(framerateAttr.indexOf('=') + 1)
  );
  return { framerate };
};

/**
 * Parses an MPEG-Dash XML node for framerate values.
 * @param node XML node from MPEG-Dash manifest
 * @returns an Object with a framerate property.
 */
const toFramerateFromElement = (node: Element): FramerateObj => {
  const framerateAttr: Node = Array.prototype.find.call(
    node.attributes,
    framerateNodeName
  );
  if (!framerateAttr) return { framerate: undefined };
  const framerate = fromFramerateAttr(framerateAttr.nodeValue);
  return { framerate };
};

/**
 * Given a string or Element, calls the corresponding parsing function
 * @param x
 * @returns an Object with a framerate property
 */
const toFramerate = (x: string | Element): FramerateObj =>
  typeof x === 'string' ? toFramerateFromString(x) : toFramerateFromElement(x);
const framerateDesc = (
  { framerate: a }: FramerateObj,
  { framerate: b }: FramerateObj
) => b - a;

/**
 * Parses an HLS manifest for instances of the FRAME-RATE property and provides the highest
 * numeric value associated to those properties.
 * @param manifest HLS manifest
 * @returns Number representing the highest framerate in HLS manifest, or undefined
 */
export const FramerateProjectionHLS = (
  manifest?: string
): number | undefined => {
  if (!manifest) return FramerateProjectionDefault();
  const lines = manifest.split(/\s*?\r?\n\s*?/);
  const framerates = lines
    .filter(includesFramerate)
    .map(toFramerate)
    .sort(framerateDesc);
  // TODO: Currently just the largest value, could be fancier.
  return framerates[0] && framerates[0].framerate;
};

/**
 * Parses an MPEG-Dash manifest for frameRate properties on AdaptionSet, Representation, and SubRepresentation
 * tags and provides the highest numeric value associated to those properties.
 * @param manifest MPEG-Dash manifest
 * @returns Number representing the highest framerate in MPEG-Dash manifest, or undefined
 */
export const FramerateProjectionDash = (
  manifest?: string
): number | undefined => {
  if (!manifest) return FramerateProjectionDefault();
  const parser = new DOMParser();
  // TODO: AdaptationSet tags also have "min" and "max" frame rate attributes
  //       According to the spec, they are valued as the min/max values of all
  //       Representations in the AdaptationSet.
  //       Might be worth looking in to.
  const adaptationSetSelector = 'AdaptationSet[frameRate]:not([frameRate=""])';
  const representationSelector =
    'Representation[frameRate]:not([frameRate=""])';
  const subRepresentationSelector =
    'SubRepresentation[frameRate]:not([frameRate=""])';
  const manifestDOM: XMLDocument = parser.parseFromString(
    manifest,
    'application/xml'
  );
  const tags = manifestDOM.querySelectorAll(
    `${adaptationSetSelector}, ${representationSelector}, ${subRepresentationSelector}`
  );
  const framerates = Array.prototype.map
    .call(tags, toFramerate)
    .sort(framerateDesc);
  // TODO: Currently just the largest value, could be fancier.
  return framerates[0] && framerates[0].framerate;
};

export const FramerateProjectionDefault = (
  manifest?: string
): number | undefined => {
  return undefined;
};
