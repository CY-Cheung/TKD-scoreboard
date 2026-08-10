import React from "react";
import { ArrowRepeat, FileFill } from "react-bootstrap-icons";

const PunchIconComp = ({ size, style }) => (
  <span className="punch-icon" style={{ ...style, width: size, height: size }} />
);

const TrunkIconComp = ({ size, style }) => (
  <span className="trunk-icon" style={{ ...style, width: size, height: size }} />
);

const HelmetIconComp = ({ size, style }) => (
  <span className="helmet-icon" style={{ ...style, width: size, height: size }} />
);

/** Edit-bar scoring columns (gamjeom + pointsStat indices). */
export const EDIT_POINT_TYPES = [
  {
    id: "gamjeom",
    nameEn: "Gam-jeom",
    nameZh: "犯規",
    type: "gamjeom",
    index: null,
    icon: FileFill,
  },
  {
    id: "punch",
    nameEn: "Punch",
    nameZh: "正拳",
    type: "pointsStat",
    index: 0,
    icon: PunchIconComp,
    iconSize: "1.8cqi",
  },
  {
    id: "body",
    nameEn: "Body",
    nameZh: "軀幹",
    type: "pointsStat",
    index: 1,
    icon: TrunkIconComp,
    iconSize: "1.5cqi",
  },
  {
    id: "head",
    nameEn: "Head",
    nameZh: "頭部",
    type: "pointsStat",
    index: 2,
    icon: HelmetIconComp,
    iconSize: "1.5cqi",
  },
  {
    id: "body-turn",
    nameEn: "Body(Turn)",
    nameZh: "軀幹(轉身)",
    type: "pointsStat",
    index: 3,
    icon: ArrowRepeat,
    secondIcon: TrunkIconComp,
    iconSize: "1.5cqi",
  },
  {
    id: "head-turn",
    nameEn: "Head(Turn)",
    nameZh: "頭部(轉身)",
    type: "pointsStat",
    index: 4,
    icon: ArrowRepeat,
    secondIcon: HelmetIconComp,
    iconSize: "1.5cqi",
  },
];
