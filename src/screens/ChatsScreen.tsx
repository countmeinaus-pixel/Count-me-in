import { Fish, Mountain, Send } from 'lucide-react'
import { chats } from '../data/mockData'

const icons = {
  fish: Fish,
  mountain: Mountain,
}

export function ChatsScreen() {
  return (
    <div className="screen">
      <header className="page-title">
        <p className="eyebrow">Your crew</p>
        <h1>Chats</h1>
      </header>

      {chats.map((chat) => {
        const Icon = icons[chat.sport as keyof typeof icons] ?? Fish
        return (
          <div key={chat.id} className="chat-row">
            <div className="sport-icon"><Icon /></div>
            <div className="grow">
              <strong>{chat.title}</strong>
              <p>{chat.preview}</p>
            </div>
            <div className="chat-meta">
              <span>{chat.time}</span>
              {chat.unread && <i />}
            </div>
          </div>
        )
      })}

      <div className="chat-preview">
        <p>Messages open once your join request is accepted.</p>
        <div className="message-input">
          <span>Message the group</span>
          <Send />
        </div>
      </div>
    </div>
  )
}
