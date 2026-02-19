"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { VideoPlayer } from '@/components/VideoPlayer';
import { QuizComponent } from '@/components/QuizComponent';
import { LessonSidebar } from '@/components/LessonSidebar';
import { ProgressTracker } from '@/components/ProgressTracker';
import { FinalCodeUnlock } from '@/components/FinalCodeUnlock';
import { Lesson, Level, LessonProgress, Instructor } from '@/lib/types';
import { saveLessonProgress, getUserProgress, getProgressStats, isBootcampCompleted } from '@/lib/storage';

export default function LessonPage() {
  const params = useParams();
  const instructorId = params.id as Instructor;
  const levelId = params.level as Level;
  const lessonId = params.lesson as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [bootcampDone, setBootcampDone] = useState(false);
  const [showFinalCode, setShowFinalCode] = useState(false);

  useEffect(() => {
    // Load lesson data
    const fakeLessons: Lesson[] = [
      {
        id: 'lesson-1',
        title: 'Market Structure Basics',
        description: 'Understanding support and resistance levels',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        quiz: [
          {
            question: 'What is a support level?',
            options: ['Price floor', 'Price ceiling', 'Volatility measure'],
            answer: 0,
          },
        ],
      },
    ];

    const lesson = fakeLessons.find((l) => l.id === lessonId);
    if (lesson) {
      setLesson(lesson);
      setAllLessons(fakeLessons);
    }

    // Load progress
    const userProgress = getUserProgress(instructorId, levelId);
    setProgress(userProgress?.lessons || []);

    // Check if bootcamp is complete
    const completed = isBootcampCompleted(instructorId);
    setBootcampDone(completed);
  }, [instructorId, levelId, lessonId]);

  const handleQuizComplete = (score: number) => {
    saveLessonProgress(instructorId, levelId, lessonId, true, score);
    setProgress((prev) => {
      const existing = prev.find((p) => p.lessonId === lessonId);
      if (existing) {
        return prev.map((p) =>
          p.lessonId === lessonId ? { ...p, completed: true, quizScore: score } : p
        );
      }
      return [
        ...prev,
        { lessonId, completed: true, quizScore: score, timestamp: Date.now() },
      ];
    });

    // Check if all lessons are complete
    const nextLessonIndex = allLessons.findIndex((l) => l.id === lessonId) + 1;
    if (nextLessonIndex < allLessons.length) {
      // Auto navigate to next lesson
      setTimeout(() => {
        window.location.href = `/instructor/${instructorId}/${levelId}/${allLessons[nextLessonIndex].id}`;
      }, 1000);
    } else {
      // Level complete, show completion message
      // Check if bootcamp complete
      const stats = getProgressStats(instructorId);
      if (stats.percentage === 100) {
        setBootcampDone(true);
        setShowFinalCode(true);
      }
    }

    setShowQuiz(false);
  };

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-400">Loading lesson...</p>
      </div>
    );
  }

  if (showFinalCode && bootcampDone) {
    return (
      <div className="min-h-screen bg-gray-950 py-16">
        <div className="container-max">
          <FinalCodeUnlock
            instructor={instructorId}
            onSuccess={() => window.location.href = '/'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <LessonSidebar
        lessons={allLessons}
        currentLessonId={lessonId}
        progress={progress}
        instructor={instructorId}
        level={levelId}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="container-max max-w-5xl">
            {/* Video Player */}
            <VideoPlayer lesson={lesson} />

            {/* Progress Tracker */}
            <div className="mt-8 max-w-2xl">
              <ProgressTracker
                total={allLessons.length}
                completed={progress.filter((p) => p.completed).length}
                percentage={Math.round(
                  (progress.filter((p) => p.completed).length / allLessons.length) * 100
                )}
              />
            </div>

            {/* Quiz Section */}
            {lesson.quiz && lesson.quiz.length > 0 && (
              <motion.div className="mt-12">
                <div className="max-w-2xl">
                  {!showQuiz ? (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setShowQuiz(true)}
                      className="button-primary text-lg px-8 py-4 w-full"
                    >
                      Take Quiz to Continue
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <QuizComponent
                        quiz={lesson.quiz}
                        onComplete={handleQuizComplete}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
