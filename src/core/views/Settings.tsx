import { useEffect, useState } from "react"
import useSWR from "swr"

import { get, post } from "~core/api"
import { Accordion } from "~core/components/pure/Accordion"
import { Button } from "~core/components/pure/Button"
import { Dropdown } from "~core/components/pure/Dropdown"
import { Input } from "~core/components/pure/Input"
import { Spinner } from "~core/components/pure/Spinner"
import { Splitter } from "~core/components/pure/Splitter"
import { Text } from "~core/components/pure/Text"
import Tooltip from "~core/components/pure/Tooltip"
import { Well } from "~core/components/pure/Well"
import type { CompletionResponse } from "~core/constants"
import {
  Config,
  DefaultCompletionURL,
  LLM,
  LLMLabels,
  configManager
} from "~core/managers/config"
import { UserInfoProvider, useUserInfo } from "~core/providers/user-info"
import { isOk, unwrap } from "~core/utils/result-monad"

export function Settings() {
  // const [loading, setLoading] = useState(false)
  const uiDefaultModel = LLM.GPT3
  const [selectedModel, setSelectedModel] = useState<LLM>(uiDefaultModel)
  const [apiKey, setApiKey] = useState("")
  const [url, setUrl] = useState("")
  const [config, setConfig] = useState<Config | undefined>()
  const [defaultModel, setDefaultModel] = useState<LLM>(uiDefaultModel)

  useEffect(() => {
    configManager.get(selectedModel).then((c) => {
      const config = c || configManager.init(selectedModel)
      setConfig(config)
    })
  }, [selectedModel])

  useEffect(() => {
    configManager.getDefault().then((c) => {
      setDefaultModel(c.id)
      setSelectedModel(c.id)
    })
  }, [])

  useEffect(() => {
    setApiKey(config?.apiKey || "")
    setUrl(config?.completionUrl || "")
  }, [config])

  async function saveAll() {
    if (!config) {
      return
    }
    return configManager.save({
      ...config,
      apiKey: apiKey
    })
  }

  const isLocalModel = selectedModel === LLM.Local

  return (
    <div className="flex flex-col">
      <Text size="lg" strength="bold">
        Configuration
      </Text>
      <div className="my-4">
        <Text size="xs" dimming="less">
          Change your model settings here. API keys are only stored in your
          browser.{" "}
          <Tooltip
            content={
              <span>
                An API key is required for external models like OpenAI, but not
                for ones running locally on your computer.
              </span>
            }>
            Learn more
          </Tooltip>
          .
        </Text>
      </div>
      <Well>
        <div className="-my-3">
          <Text strength="medium" dimming="less">
            Default model
          </Text>
        </div>
        <Splitter />
        <Dropdown<LLM>
          styled
          choices={Object.values(LLM)}
          onSelect={async (id) => {
            await configManager.setDefault(id)
            setDefaultModel(id)
            setSelectedModel(id)
          }}>
          {LLMLabels[defaultModel]}
        </Dropdown>
      </Well>
      <div className="py-4">
        <Well>
          <div className="-my-3">
            <Text strength="medium" dimming="less">
              Model settings
            </Text>
          </div>
          <Splitter />
          <Dropdown<LLM>
            choices={Object.values(LLM)}
            onSelect={(v) => setSelectedModel(v)}>
            {LLMLabels[selectedModel]}
          </Dropdown>

          <div className="">
            {!isLocalModel && (
              <Input
                placeholder="API Key"
                value={apiKey || ""}
                onChange={(val) => setApiKey(val)}
                onBlur={saveAll}
              />
            )}
            <div className="mt-3"></div>
            <Accordion title="Advanced" initiallyOpened={isLocalModel}>
              <Input
                placeholder="URL"
                type="url"
                name="completion-url"
                value={url || DefaultCompletionURL[selectedModel]}
                onChange={(val) => setUrl(val)}
                onBlur={saveAll}
              />
              <label
                htmlFor={"completion-url"}
                className="block text-xs font-medium opacity-60 mt-2">
                {selectedModel === LLM.Local
                  ? "Use any URL, including localhost!"
                  : "Optionally use this to set a proxy. Only change if you know what you're doing."}
              </label>
            </Accordion>
          </div>
        </Well>
      </div>
    </div>
  )
}

//
//
//
// Delete the components below once we decide on Stripe

function DEP_Settings({ onSave }: { onSave: () => void }) {
  return (
    <UserInfoProvider>
      <Text size="lg" strength="bold">
        Settings
      </Text>
      <PersonalInfo />
      <div className="mt-4">
        <div className="font-bold">Premium features</div>
        <div className="text-sm text-slate-500">
          <StripeGatedButton />
        </div>
      </div>
      <Button onClick={onSave}>Save</Button>
    </UserInfoProvider>
  )
}

const PersonalInfo = () => {
  const userInfo = useUserInfo()

  return (
    <Text dimming="less">
      Email: <b>{userInfo?.email}</b>
    </Text>
  )
}

const StripeGatedButton = () => {
  const userInfo = useUserInfo()
  const [loading, setLoading] = useState(false)

  const { data, error } = useSWR(`/api/check-subscription`, (url) =>
    get<{ active: boolean }>(url).then(unwrap)
  )
  const isSubscribed = !error && data?.active

  if (!isSubscribed) {
    return (
      <div>
        {error && (
          <div style={{ color: "red" }}>
            Failed to fetch subscription: {error.toString()}
          </div>
        )}
        <button
          disabled={!userInfo}
          onClick={async () => {
            chrome.identity.getAuthToken(
              {
                interactive: true
              },
              (token) => {
                if (!!token) {
                  window.open(
                    `${
                      process.env.PLASMO_PUBLIC_STRIPE_LINK
                    }?client_reference_id=${
                      userInfo?.id || ""
                    }&prefilled_email=${encodeURIComponent(
                      userInfo?.email || ""
                    )}`,
                    "_blank"
                  )
                }
              }
            )
          }}>
          Unlock GPT-4
        </button>
      </div>
    )
  }

  return (
    <Button
      onClick={async (e) => {
        setLoading(true)
        const res = await post<CompletionResponse>("/api/model/complete", {
          prompt: "The quick brown fox"
        })
        setLoading(false)
        if (isOk(res)) {
          alert(res.data)
        }
      }}
      disabled={loading}
      className="bg-slate-300">
      The quick brown fox... {loading && <Spinner />}
    </Button>
  )
}
