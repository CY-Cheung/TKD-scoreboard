import './Mask.css'

function Mask() {

  return (
    <div className="mask" onClick={() => document.documentElement.requestFullscreen()}/>
  )
}

export default Mask