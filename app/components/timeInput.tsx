'use client';

type Props={
    value:string;
    onChange:(v:string)=>void;
    label:string;
}

const timeInput = ({value,onChange,label}:Props) => {
  return (
    <div className="flex flex-col gap">
        <label className="text-sm text-gray-600">{label}</label>
        <input 
            className="rounded border p-2"
            placeholder="HH:MM:SS"
            value={value}
            onChange={e => onChange(e.target.value)}
        />/
    </div>
  )
}

export default timeInput