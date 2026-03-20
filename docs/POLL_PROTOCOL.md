# Proto-XEP: Client-Side Polls via Reactions

**Namespace:** `urn:fluux:poll:0`
**Dependencies:** XEP-0444 (Message Reactions), XEP-0045 (MUC), XEP-0428 (Fallback Indication), XEP-0334 (Message Processing Hints)
**Status:** Experimental (client-side implementation)

---

## 1. Introduction

This document describes a protocol for creating and managing polls in XMPP Multi-User Chat (MUC) rooms. The design leverages existing XEP-0444 reactions as the voting mechanism — each poll option maps to an emoji, and voting is simply reacting with that emoji.

This approach has several advantages:

- **Incremental deployment:** Works today with any MUC service that supports XEP-0444 reactions. No server modifications required.
- **Legacy compatibility:** Non-poll-aware clients see a readable text fallback and can vote by sending numbered-emoji reactions.
- **Future server enforcement:** The wire format is designed so that a future MUC component or server module can enforce voting rules (single vote, deadline lock, result broadcast) without changing the client protocol.

### 1.1 Motivation

Polls are a natural fit for group chat. They allow participants to quickly gather opinions, make decisions, or vote on topics. While several proprietary chat platforms offer polling features, XMPP lacks a standardized approach.

By building on XEP-0444 reactions, this protocol avoids introducing a new voting transport and instead reuses an existing, well-understood mechanism. The poll metadata (question, options, settings) is carried as a structured XML element alongside a human-readable fallback body.

---

## 2. Requirements

- The sending client MUST support XEP-0444 (Message Reactions).
- The MUC room MUST support XEP-0444 reactions for voting to work.
- The sending client SHOULD support XEP-0428 (Fallback Indication) to mark the text body as a fallback.
- The sending client SHOULD include XEP-0334 `<store/>` hints to ensure poll messages are archived.

---

## 3. Poll Message

A poll is sent as a `<message type="groupchat">` containing a `<poll>` element in the `urn:fluux:poll:0` namespace.

### 3.1 XML Schema

```xml
<message to="room@conference.example.com" type="groupchat" id="poll-msg-1">
  <body>📊 Poll: What for lunch?
1️⃣ Pizza
2️⃣ Sushi
3️⃣ Tacos</body>

  <poll xmlns="urn:fluux:poll:0" allow-multiple="false">
    <title>What for lunch?</title>
    <option emoji="1️⃣">Pizza</option>
    <option emoji="2️⃣">Sushi</option>
    <option emoji="3️⃣">Tacos</option>
  </poll>

  <fallback xmlns="urn:xmpp:fallback:0" for="urn:fluux:poll:0">
    <body/>
  </fallback>
  <store xmlns="urn:xmpp:hints"/>
</message>
```

### 3.2 `<poll>` Element

| Attribute        | Type              | Required | Description                                                                                    |
|------------------|-------------------|----------|------------------------------------------------------------------------------------------------|
| `allow-multiple` | boolean           | No       | If `"true"`, voters may select more than one option. Defaults to `"false"` (single-vote mode). |
| `hide-results`   | boolean           | No       | If `"true"`, results are hidden from voters until they have voted. Defaults to `"false"`.      |
| `deadline`       | string (ISO 8601) | No       | Deadline after which voting is blocked. Clients SHOULD refuse to submit votes after this time. |

### 3.3 Child Elements of `<poll>`

| Element         | Required | Description                                                                                                          |
|-----------------|----------|----------------------------------------------------------------------------------------------------------------------|
| `<title>`       | Yes      | The poll question or title. MUST be non-empty.                                                                       |
| `<description>` | No       | Optional longer description providing context for the poll.                                                          |
| `<option>`      | Yes (2+) | A poll option. At least 2 options are required. Each option has an `emoji` attribute and text content for the label. |

### 3.4 `<option>` Element

| Attribute | Type   | Required | Description                                                                                                                                |
|-----------|--------|----------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `emoji`   | string | Yes      | The emoji that represents this option. When using the default numbered set, this is `1️⃣`, `2️⃣`, `3️⃣`, `4️⃣`. Custom emojis are allowed. |

The text content of `<option>` is the human-readable label for the option.

### 3.5 Default Emoji Set

When no custom emojis are specified, options use the standard numbered emoji sequence:

| Index | Emoji |
|-------|-------|
| 0     | 1️⃣   |
| 1     | 2️⃣   |
| 2     | 3️⃣   |
| 3     | 4️⃣   |
| 4     | 5️⃣   |
| 5     | 6️⃣   |
| 6     | 7️⃣   |
| 7     | 8️⃣   |
| 8     | 9️⃣   |

The default set supports up to 9 options. Custom emojis allow unlimited options.

### 3.6 Fallback Body

The `<body>` element contains a human-readable text representation of the poll for legacy clients:

```
📊 Poll: What for lunch?
1️⃣ Pizza
2️⃣ Sushi
3️⃣ Tacos
```

If a description is present, it appears on the second line:

```
📊 Poll: What for lunch?
Pick your favorite option
1️⃣ Pizza
2️⃣ Sushi
3️⃣ Tacos
```

A `<fallback xmlns="urn:xmpp:fallback:0" for="urn:fluux:poll:0">` element (XEP-0428) SHOULD be included so that poll-aware clients know to strip the fallback body and render the structured poll UI instead.

---

## 4. Voting

Voting is performed using XEP-0444 Message Reactions. To vote for an option, a participant sends a reaction containing the option's emoji, targeted at the poll message ID.

### 4.1 Single-Vote Mode (`allow-multiple="false"`)

In single-vote mode, a client MUST ensure that the user's reaction set contains at most one poll-option emoji. When voting for a new option:

1. Remove all poll-option emojis from the current reaction set.
2. Add the newly selected emoji.
3. Preserve any non-poll emojis (e.g., 👍 thumbs-up on the poll message).

If the user clicks an already-selected option, it is toggled off (removed), resulting in no poll vote.

**Example:** User currently has reactions `[1️⃣, 👍]` and votes for option 2:
- Remove `1️⃣` (poll emoji)
- Keep `👍` (non-poll emoji)
- Add `2️⃣`
- Send reactions: `[👍, 2️⃣]`

### 4.2 Multi-Vote Mode (`allow-multiple="true"`)

In multi-vote mode, clicking an option toggles it on or off in the user's reaction set, independently of other options.

**Example:** User currently has reactions `[1️⃣, 3️⃣]` and clicks option 1:
- Toggle off `1️⃣`
- Send reactions: `[3️⃣]`

### 4.3 Deadline Enforcement

If the `deadline` attribute is present and the current time is past the deadline, clients SHOULD NOT send vote reactions. The UI should indicate that voting has ended.

Note: Deadline enforcement is currently client-side only. A future server-side component could reject reaction stanzas on expired polls.

### 4.4 Wire Format (XEP-0444)

A vote is a standard XEP-0444 reactions stanza:

```xml
<message to="room@conference.example.com" type="groupchat" id="vote-1">
  <reactions xmlns="urn:xmpp:reactions:0" id="poll-msg-1">
    <reaction>2️⃣</reaction>
    <reaction>👍</reaction>
  </reactions>
  <store xmlns="urn:xmpp:hints"/>
</message>
```

The `id` attribute on `<reactions>` references the original poll message ID.

---

## 5. Closing a Poll

The poll creator can close a poll at any time by sending a `<poll-closed>` message to the room. This serves as the authoritative final result.

### 5.1 XML Schema

```xml
<message to="room@conference.example.com" type="groupchat" id="close-msg-1">
  <body>📊 Poll closed: What for lunch?
1️⃣ Pizza: 3
2️⃣ Sushi: 7
3️⃣ Tacos: 1</body>

  <poll-closed xmlns="urn:fluux:poll:0" message-id="poll-msg-1">
    <title>What for lunch?</title>
    <tally emoji="1️⃣" count="3"/>
    <tally emoji="2️⃣" count="7"/>
    <tally emoji="3️⃣" count="1"/>
  </poll-closed>

  <fallback xmlns="urn:xmpp:fallback:0" for="urn:fluux:poll:0">
    <body/>
  </fallback>
  <store xmlns="urn:xmpp:hints"/>
</message>
```

### 5.2 `<poll-closed>` Element

| Attribute    | Type   | Required | Description                                       |
|--------------|--------|----------|---------------------------------------------------|
| `message-id` | string | Yes      | The ID of the original poll message being closed. |

### 5.3 Child Elements of `<poll-closed>`

| Element         | Required | Description                                                                 |
|-----------------|----------|-----------------------------------------------------------------------------|
| `<title>`       | Yes      | The original poll title (for display without needing the original message). |
| `<description>` | No       | The original poll description, if any.                                      |
| `<tally>`       | No (0+)  | One per option, containing the final vote count.                            |

### 5.4 `<tally>` Element

| Attribute | Type    | Required | Description                                                      |
|-----------|---------|----------|------------------------------------------------------------------|
| `emoji`   | string  | Yes      | The option emoji.                                                |
| `count`   | integer | Yes      | The final number of votes for this option. MUST be non-negative. |

### 5.5 Creator-Only Action

Only the poll creator's client should send `<poll-closed>` messages. Other clients should ignore or reject attempts to close polls they did not create. Future server enforcement could verify the sender's occupant-id matches the original poll creator.

---

## 6. Result Query (IQ)

Clients that join a room late or need to verify results can query the poll creator for the current tally via an IQ stanza.

### 6.1 Query

```xml
<iq type="get" to="creator@example.com/resource" id="poll-q1">
  <poll-results xmlns="urn:fluux:poll:0"
    message-id="poll-msg-1"
    room="room@conference.example.com"/>
</iq>
```

| Attribute    | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| `message-id` | string | Yes      | The poll message ID to query.            |
| `room`       | string | Yes      | The room JID where the poll was created. |

### 6.2 Response

```xml
<iq type="result" to="requester@example.com/resource" id="poll-q1">
  <poll-results xmlns="urn:fluux:poll:0"
    message-id="poll-msg-1"
    closed="false">
    <tally emoji="1️⃣" count="3"/>
    <tally emoji="2️⃣" count="7"/>
    <tally emoji="3️⃣" count="1"/>
  </poll-results>
</iq>
```

| Attribute | Type    | Description                                      |
|-----------|---------|--------------------------------------------------|
| `closed`  | boolean | Whether the poll has been closed by its creator. |

### 6.3 Error Response

If the creator's client does not recognize the poll (e.g., it was created in a previous session):

```xml
<iq type="error" to="requester@example.com/resource" id="poll-q1">
  <poll-results xmlns="urn:fluux:poll:0" message-id="poll-msg-1"/>
  <error type="cancel">
    <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>
  </error>
</iq>
```

### 6.4 Limitations

The IQ query mechanism requires the poll creator to be online. If the creator is offline, clients fall back to tallying results from the locally observed XEP-0444 reactions (best-effort). A future server-side component could provide authoritative results regardless of creator presence.

---

## 7. Result Tallying

Poll results are computed from the reactions map on the poll message. For each option, the list of voters is the set of participants who reacted with that option's emoji.

### 7.1 Algorithm

```
for each option in poll.options:
  voters = reactions[option.emoji] or []
  count = len(voters)
```

### 7.2 Total Voters

The total number of unique voters is the union of all voter sets across all options. In multi-vote mode, a single participant who voted for multiple options is counted once.

### 7.3 Hide-Results Mode

When `hide-results="true"`, clients SHOULD NOT display vote counts or progress bars to a participant until they have voted on at least one option. After voting, results are shown normally.

---

## 8. Legacy Client Compatibility

The protocol is designed so that clients unaware of `urn:fluux:poll:0` can still participate:

1. **Viewing polls:** The `<body>` contains a formatted text representation (e.g., `📊 Poll: What for lunch?\n1️⃣ Pizza\n2️⃣ Sushi`). Legacy clients display this as a normal message.

2. **Voting:** A user on a legacy client can vote by sending a numbered-emoji reaction (1️⃣, 2️⃣, etc.) on the poll message. This is the same XEP-0444 mechanism that poll-aware clients use.

3. **Viewing results:** The `<poll-closed>` message includes a text body with the tally. Legacy clients see this as a normal message.

The `<fallback>` element (XEP-0428) signals to poll-aware clients that the `<body>` is a fallback representation and should be replaced by the structured poll UI.

---

## 9. Security Considerations

### 9.1 Vote Integrity

In the current client-side implementation, voting rules (single-vote, deadline) are enforced locally. A malicious client could:

- Send multiple reactions in single-vote mode.
- Vote after the deadline has passed.
- Spoof vote counts in `<poll-closed>` messages.

These attacks are mitigated by:
- **Tally verification:** Clients can independently tally results from the reactions map and compare against `<poll-closed>` data.
- **Server enforcement (future):** A MUC component could enforce single-vote rules by rejecting invalid reaction stanzas, and verify `<poll-closed>` sender identity.

### 9.2 Creator Identity

The `<poll-closed>` message should only be accepted from the original poll creator. In MUC, this can be verified by comparing occupant-id (XEP-0421) or occupant JID. Without server enforcement, clients rely on the MUC service's existing identity guarantees.

### 9.3 Denial of Service

A participant could create excessive polls to spam a room. This is a general MUC moderation concern and can be addressed by existing room moderation tools (kick, ban, rate limiting).

### 9.4 Privacy

Reaction-based voting is inherently **public** — all participants can see who voted for which option. This is by design for the initial implementation. A future extension could support anonymous voting via server-side aggregation, where the MUC component collects votes and only publishes aggregate counts.

---

## 10. Future Extensions

### 10.1 Server-Side Enforcement

A MUC component module could:
- Validate that reactions on poll messages conform to voting rules.
- Reject duplicate votes in single-vote mode.
- Lock voting after the deadline.
- Broadcast `<poll-closed>` on behalf of the creator when the deadline expires.
- Respond to `<poll-results>` IQ queries authoritatively, eliminating the need for the creator to be online.

### 10.2 Anonymous Voting

A server-side component could support anonymous polls by:
- Accepting votes via a private IQ to the MUC component (not as public reactions).
- Publishing only aggregate counts to the room, without revealing individual voters.
- Requiring a `<poll anonymous="true">` attribute to enable this mode.

### 10.3 Extended Option Set

The default numbered emoji set (1️⃣–9️⃣) covers up to 9 options. Custom emojis already allow more, but a standardized extended set (🔟 and beyond, or lettered emojis) could be defined for broader compatibility.

### 10.4 Poll Editing

Allow the poll creator to edit the question or options after creation using XEP-0308 (Message Correction). This requires careful handling to avoid invalidating existing votes.

### 10.5 Scheduled Polls

Support for polls that open at a future time, using a `start` attribute alongside `deadline`.

---

## 11. Namespace

The protocol uses the namespace `urn:fluux:poll:0`. The `:0` suffix indicates this is an experimental version. Future standardized versions would use a versioned namespace (e.g., `urn:xmpp:poll:1`) registered with the XMPP Registrar.

---

## 12. XML Schema

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="urn:fluux:poll:0"
           xmlns:tns="urn:fluux:poll:0"
           elementFormDefault="qualified">

  <!-- Poll message element -->
  <xs:element name="poll">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="title" type="xs:string"/>
        <xs:element name="description" type="xs:string" minOccurs="0"/>
        <xs:element name="option" maxOccurs="unbounded" minOccurs="2">
          <xs:complexType>
            <xs:simpleContent>
              <xs:extension base="xs:string">
                <xs:attribute name="emoji" type="xs:string" use="required"/>
              </xs:extension>
            </xs:simpleContent>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
      <xs:attribute name="allow-multiple" type="xs:boolean" default="false"/>
      <xs:attribute name="hide-results" type="xs:boolean" default="false"/>
      <xs:attribute name="deadline" type="xs:dateTime"/>
    </xs:complexType>
  </xs:element>

  <!-- Poll closed element -->
  <xs:element name="poll-closed">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="title" type="xs:string"/>
        <xs:element name="description" type="xs:string" minOccurs="0"/>
        <xs:element name="tally" minOccurs="0" maxOccurs="unbounded">
          <xs:complexType>
            <xs:attribute name="emoji" type="xs:string" use="required"/>
            <xs:attribute name="count" type="xs:nonNegativeInteger" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
      <xs:attribute name="message-id" type="xs:string" use="required"/>
    </xs:complexType>
  </xs:element>

  <!-- Poll results IQ payload -->
  <xs:element name="poll-results">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="tally" minOccurs="0" maxOccurs="unbounded">
          <xs:complexType>
            <xs:attribute name="emoji" type="xs:string" use="required"/>
            <xs:attribute name="count" type="xs:nonNegativeInteger" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
      <xs:attribute name="message-id" type="xs:string" use="required"/>
      <xs:attribute name="room" type="xs:string"/>
      <xs:attribute name="closed" type="xs:boolean"/>
    </xs:complexType>
  </xs:element>

</xs:schema>
```

---

## 13. Acknowledgements

This protocol builds on the following extensions:

- **XEP-0444** (Message Reactions) — The voting mechanism.
- **XEP-0045** (Multi-User Chat) — The room environment where polls operate.
- **XEP-0428** (Fallback Indication) — Marking the text body as a fallback for structured content.
- **XEP-0334** (Message Processing Hints) — Ensuring poll messages are stored for MAM retrieval.
- **XEP-0421** (Occupant Id) — Future identity verification for creator-only actions.
