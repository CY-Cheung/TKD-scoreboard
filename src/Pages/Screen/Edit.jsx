import "./Edit.css";
import Button from "../../Components/Button/Button";
import { useState } from "react";
import Mask from "../../Components/Mask/Mask";
import Card from "../../Components/Card/Card";


function Edit({ visible, setVisible }) {
	if (!visible) return null;
	return (
		<>
			<Mask />
			<Card />
		</>
	);
}

export default Edit;
