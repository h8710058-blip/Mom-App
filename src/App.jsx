import { useCallback, useEffect, useState } from 'react';
import { lessons } from './lessons/index.js';
import { load, save } from './storage.js';
import Home from './screens/Home.jsx';
import LessonPlayer from './screens/LessonPlayer.jsx';
import Walkthrough from './screens/Walkthrough.jsx';
import { config } from './config.js';

export default function App() {
  const [data, setData] = useState(load);
  const [screen, setScreen] = useState(() => (data.seenWalkthrough ? { name: 'home' } : { name: 'walkthrough' }));

  useEffect(() => save(data), [data]);

  const finishWalkthrough = () => {
    setData((d) => ({ ...d, seenWalkthrough: true }));
    setScreen({ name: 'home' });
  };

  const complete = useCallback((id, mode) => {
    setData((d) => ({ ...d, lessons: { ...d.lessons, [id]: { ...(d.lessons[id] || {}), [mode]: true } } }));
  }, []);

  const lesson = screen.name === 'lesson' ? lessons.find((l) => l.id === screen.id) : null;

  return (
    <div className="app">
      <header className="appbar">
        <button className="brand" onClick={() => setScreen({ name: 'home' })} aria-label="Go to the home screen">
          <img src="./icon.svg" alt="" width="40" height="40" />
          <span>{config.appName}</span>
        </button>
        <button className="btn ghost" onClick={() => setScreen({ name: 'walkthrough' })}>
          ? Help
        </button>
      </header>
      <main>
        {screen.name === 'walkthrough' && <Walkthrough onFinish={finishWalkthrough} />}
        {screen.name === 'home' && (
          <Home
            lessons={lessons}
            progress={data}
            settings={data.settings}
            onOpen={(id) => setScreen({ name: 'lesson', id })}
            onToggleRead={() => setData((d) => ({ ...d, settings: { ...d.settings, autoRead: !d.settings.autoRead } }))}
            onReplayWalkthrough={() => setScreen({ name: 'walkthrough' })}
          />
        )}
        {lesson && (
          <LessonPlayer
            key={lesson.id}
            lesson={lesson}
            lessons={lessons}
            progress={data}
            settings={data.settings}
            onExit={() => setScreen({ name: 'home' })}
            onOpenLesson={(id) => setScreen({ name: 'lesson', id })}
            onComplete={complete}
          />
        )}
      </main>
    </div>
  );
}
