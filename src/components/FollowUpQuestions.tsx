import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  question: string;
  options?: string[];
}

interface FollowUpQuestionsProps {
  questions: Question[];
  onSubmit: (answers: Record<number, string>) => void;
  loading: boolean;
}

export function FollowUpQuestions({ questions, onSubmit, loading }: FollowUpQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [customTexts, setCustomTexts] = useState<Record<number, string>>({});

  const current = questions[currentIndex];
  const total = questions.length;
  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  const setAnswer = (id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setCustomTexts((prev) => ({ ...prev, [id]: "" }));
  };

  const setCustomText = (id: number, value: string) => {
    setCustomTexts((prev) => ({ ...prev, [id]: value }));
    if (value.trim()) {
      setAnswers((prev) => ({ ...prev, [id]: value.trim() }));
    }
  };

  const goNext = () => {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium font-display">Follow-up Questions</p>
          <p className="text-xs text-muted-foreground">Question {currentIndex + 1} of {total}</p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === currentIndex ? "w-8 bg-primary" : answers[questions[i].id] ? "w-2 bg-primary/50" : "w-2 bg-muted-foreground/20"
            )}
          />
        ))}
      </div>

      {/* Flashcard */}
      <Card className="glass-card overflow-hidden border-t-4 border-t-primary/30">
        <CardContent className="p-6 space-y-5">
          <div className="min-h-[200px] flex flex-col justify-between">
            <div className="space-y-4">
              <p className="text-lg font-semibold font-display leading-snug">
                <span className="text-primary mr-2">Q{currentIndex + 1}.</span>
                {current.question}
              </p>

              {/* Option chips */}
              {current.options && current.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {current.options.map((opt) => (
                    <Badge
                      key={opt}
                      variant={answers[current.id] === opt && !customTexts[current.id]?.trim() ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-sm px-4 py-2 transition-all hover:scale-105",
                        answers[current.id] === opt && !customTexts[current.id]?.trim()
                          ? "shadow-md"
                          : "hover:bg-secondary"
                      )}
                      onClick={() => setAnswer(current.id, opt)}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Custom text input */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Or describe in your own words...</p>
                <Input
                  placeholder="Type your answer..."
                  value={customTexts[current.id] || ""}
                  onChange={(e) => setCustomText(current.id, e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              {currentIndex < total - 1 ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={goNext}
                  disabled={!answers[current.id]?.trim()}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => onSubmit(answers)}
                  disabled={!allAnswered || loading}
                  className="gap-1"
                >
                  {loading ? "Analyzing..." : (
                    <>
                      <Send className="h-4 w-4" /> Submit
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
