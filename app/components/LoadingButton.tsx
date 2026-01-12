
type Props={
    loading:boolean;
    text:string;
}

export const LoadingButton = ({loading,text}:Props) => {
  return (
    <button disabled={loading}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
    >
        {loading?"Processing..." :text}
    </button>
  )
}
