ask for the JIRA ticket number related to each task you are working on.  update the status to "in progress" and add any relevant comments to the ticket.  use the acli tool to manage the tickets, e.g.
- acli jira workitem view EOS-676
- acli jira workitem transition --key EOS-678 --status="Testing"
- acli jira workitem comment create --key EOS-678 --body "Started working on the task"
- acli jira workitem assign --key EOS-678 --assignee "61a4577ad2e64c007146f8ff"
