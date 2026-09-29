"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { dismissErrorDialog, useErrorDialogState } from "@/lib/error-dialog"

/** App-wide host for showErrorDialog(). Mounted once in the root layout. */
export function ErrorDialogHost() {
  const state = useErrorDialogState()

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && dismissErrorDialog()}>
      {state && (
        <DialogContent className="sm:max-w-[420px]" data-testid="error-dialog">
          <DialogHeader className="items-center text-center sm:items-start sm:text-left">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
            </div>
            <DialogTitle>{state.title}</DialogTitle>
            <DialogDescription>{state.message}</DialogDescription>
          </DialogHeader>

          {(state.code || state.requestId) && (
            <p className="text-xs text-muted-foreground">
              {state.code && (
                <>
                  Error code: <code className="font-mono">{state.code}</code>
                </>
              )}
              {state.code && state.requestId && " · "}
              {state.requestId && (
                <>
                  Reference: <code className="font-mono">{state.requestId}</code>
                </>
              )}
            </p>
          )}

          <DialogFooter>
            {state.action ? (
              <>
                <Button variant="ghost" onClick={dismissErrorDialog}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const action = state.action!
                    dismissErrorDialog()
                    action.onSelect()
                  }}
                >
                  {state.action.label}
                </Button>
              </>
            ) : (
              <Button onClick={dismissErrorDialog} autoFocus>
                OK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
