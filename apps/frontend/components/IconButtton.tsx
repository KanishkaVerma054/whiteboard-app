import { ReactNode } from 'react'

export const IconButton = ({
  icon,  onClick, activated
}: {
  icon: ReactNode,
  onClick: () => void,
  activated: boolean
}) => {
  return (
    <div className={`pointer rounded-full border p-2 bg-black hover:bg-gray ${activated ? "text-blue-300" : "text-white"}`} onClick={onClick}>
      {icon}
    </div>
  )
}

